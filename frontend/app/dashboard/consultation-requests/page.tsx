"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MessageSquareText, PhoneCall, RefreshCw, Search, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatVietnamDateTime } from "@/lib/date";
import {
  useDashboardConsultationRequest,
  useDashboardConsultationRequests,
} from "@/lib/dashboard-consultation-requests-query";
import { queryKeys } from "@/lib/query-keys";
import type { ConsultationRequest, ConsultationStatus } from "@/lib/types";

const statusOptions: { label: string; value: "" | ConsultationStatus }[] = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Mới", value: "NEW" },
  { label: "Đã liên hệ", value: "CONTACTED" },
  { label: "Hoàn tất", value: "COMPLETED" },
  { label: "Đã hủy", value: "CANCELLED" },
];

const statusMeta: Record<ConsultationStatus, { label: string; className: string }> = {
  NEW: { label: "Mới", className: "bg-[#fff8eb] text-[#946200]" },
  CONTACTED: { label: "Đã liên hệ", className: "bg-[#f3f8ff] text-[#0d4f8b]" },
  COMPLETED: { label: "Hoàn tất", className: "bg-[#f0fff4] text-[#1f7a3a]" },
  CANCELLED: { label: "Đã hủy", className: "bg-[#fff3f2] text-[#b3261e]" },
};

const formatDateTime = (value: string) => formatVietnamDateTime(value);

export default function DashboardConsultationRequestsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = user?.role === "ADMIN" || user?.role === "STAFF";
  const canDelete = user?.role === "ADMIN";
  const detailRef = useRef<HTMLElement | null>(null);
  const [items, setItems] = useState<ConsultationRequest[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [status, setStatus] = useState<"" | ConsultationStatus>("");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ConsultationRequest | null>(null);
  const [editStatus, setEditStatus] = useState<ConsultationStatus>("NEW");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const query = useMemo(
    () => ({
      status: status || undefined,
      keyword: appliedKeyword || undefined,
      page,
      limit: 20,
    }),
    [appliedKeyword, page, status],
  );

  const requestsQuery = useDashboardConsultationRequests(query, canManage);
  const selectedRequestQuery = useDashboardConsultationRequest(selected?.id);
  const loading = requestsQuery.isLoading || (requestsQuery.isFetching && !items.length);

  const invalidateConsultationRequests = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardConsultationRequests }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardOverview }),
      queryClient.invalidateQueries({ queryKey: ["dashboard", "statistics"] }),
    ]);
  };

  useEffect(() => {
    if (!requestsQuery.data) return;
    const timeoutId = window.setTimeout(() => {
      setItems(requestsQuery.data.items);
      setPagination(requestsQuery.data.pagination);
      setSelected((current) => {
        if (!current) return null;
        return requestsQuery.data.items.find((item) => item.id === current.id) || null;
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [requestsQuery.data]);

  useEffect(() => {
    if (!selectedRequestQuery.data) return;
    const timeoutId = window.setTimeout(() => {
      setSelected(selectedRequestQuery.data);
      setEditStatus(selectedRequestQuery.data.status);
      setNote(selectedRequestQuery.data.note || "");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [selectedRequestQuery.data]);

  useEffect(() => {
    if (!requestsQuery.error) return;
    const timeoutId = window.setTimeout(() => {
      setError(requestsQuery.error instanceof Error ? requestsQuery.error.message : "Không tải được danh sách yêu cầu tư vấn");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [requestsQuery.error]);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const statusParam = new URLSearchParams(window.location.search).get("status");
      if (
        statusParam === "NEW" ||
        statusParam === "CONTACTED" ||
        statusParam === "COMPLETED" ||
        statusParam === "CANCELLED"
      ) {
        setStatus(statusParam);
        setPage(1);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!notice && !error) return;
    const timeoutId = window.setTimeout(() => {
      setNotice("");
      setError("");
    }, 4500);
    return () => window.clearTimeout(timeoutId);
  }, [error, notice]);

  const selectRequest = (request: ConsultationRequest) => {
    setSelected(request);
    setEditStatus(request.status);
    setNote(request.note || "");
    window.setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const applySearch = () => {
    setAppliedKeyword(keyword.trim());
    setPage(1);
  };

  const updateRequest = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const updated = await apiRequest<ConsultationRequest>(`/dashboard/consultation-requests/${selected.id}`, {
        method: "PATCH",
        body: {
          status: editStatus,
          note: note || null,
        },
      });
      setSelected(updated);
      setEditStatus(updated.status);
      setNote(updated.note || "");
      queryClient.setQueryData(queryKeys.dashboardConsultationRequest(updated.id), updated);
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      await invalidateConsultationRequests();
      setNotice("Đã cập nhật yêu cầu tư vấn");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được yêu cầu tư vấn");
    } finally {
      setBusy(false);
    }
  };

  const deleteRequest = async () => {
    if (!selected || !canDelete) return;
    const accepted = window.confirm("Xóa yêu cầu tư vấn này?");
    if (!accepted) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await apiRequest<ConsultationRequest>(`/dashboard/consultation-requests/${selected.id}`, { method: "DELETE" });
      setNotice("Đã xóa yêu cầu tư vấn");
      setSelected(null);
      await invalidateConsultationRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được yêu cầu tư vấn");
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) {
    return (
      <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm font-medium text-[var(--text-muted)]">Tư vấn</p>
        <h2 className="mt-1 text-2xl font-semibold">Yêu cầu tư vấn</h2>
        <p className="mt-2 text-sm text-[var(--text-soft)]">Module này chỉ dành cho ADMIN hoặc STAFF.</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {notice || error ? (
        <div className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-md sm:right-6 sm:top-6">
          <div className={`rounded-md border px-4 py-3 shadow-lg ${error ? "border-[#f2b8b5] bg-[#fff3f2] text-[#b3261e]" : "border-[#a8dab5] bg-[#f0fff4] text-[#1f7a3a]"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{error ? "Có lỗi xảy ra" : "Thành công"}</p>
                <p className="mt-1 text-sm">{error || notice}</p>
              </div>
              <button type="button" onClick={() => { setError(""); setNotice(""); }} className="rounded-md px-2 text-lg leading-none opacity-70 hover:bg-black/5 hover:opacity-100" aria-label="Đóng thông báo">x</button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-muted)]">Chăm sóc khách hàng</p>
            <h2 className="mt-1 text-2xl font-semibold">Yêu cầu tư vấn</h2>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Theo dõi khách để lại số điện thoại trên website, ghi chú nội bộ và chuyển trạng thái sau khi đã liên hệ.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-[180px_minmax(220px,1fr)_auto_auto]">
            <select value={status} onChange={(event) => { setStatus(event.target.value as "" | ConsultationStatus); setPage(1); }} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]">
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
              placeholder="Tìm tên, SĐT hoặc nội dung"
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
            />
            <button type="button" onClick={applySearch} className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-soft)] hover:bg-[var(--surface-soft)]">
              <Search className="h-4 w-4" aria-hidden="true" />
              Tìm
            </button>
            <button type="button" onClick={() => void invalidateConsultationRequests()} className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-soft)] hover:bg-[var(--surface-soft)]">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Tải lại
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="bg-[var(--surface-muted)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Khách hàng</th>
                  <th className="px-4 py-3 font-semibold">Nội dung</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Thời gian</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">Đang tải yêu cầu tư vấn...</td>
                  </tr>
                ) : items.length ? items.map((item) => (
                  <tr key={item.id} className={`border-t border-[var(--border-soft)] ${selected?.id === item.id ? "bg-[var(--primary-soft)]/40" : ""}`}>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold">{item.fullName || "Khách chưa nhập tên"}</p>
                      <a href={`tel:${item.phone}`} className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--primary)]">
                        <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                        {item.phone}
                      </a>
                    </td>
                    <td className="max-w-sm px-4 py-3 align-top text-[var(--text-soft)]">
                      <p className="line-clamp-2">{item.message || "Không có nội dung"}</p>
                      {item.note ? <p className="mt-1 line-clamp-1 text-xs text-[var(--text-muted)]">Ghi chú: {item.note}</p> : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusMeta[item.status].className}`}>{statusMeta[item.status].label}</span>
                    </td>
                    <td className="px-4 py-3 align-top text-[var(--text-soft)]">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-3 text-right align-top">
                      <button type="button" onClick={() => selectRequest(item)} className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-soft)] hover:bg-[var(--surface-soft)]">
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">Chưa có yêu cầu tư vấn phù hợp.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[var(--border-soft)] px-4 py-3 text-sm text-[var(--text-muted)]">
            <span>{pagination.total} kết quả, trang {pagination.page}/{pagination.totalPages}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-md border border-[var(--border)] px-3 py-1.5 disabled:opacity-50">Trước</button>
              <button type="button" onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))} disabled={page >= pagination.totalPages} className="rounded-md border border-[var(--border)] px-3 py-1.5 disabled:opacity-50">Sau</button>
            </div>
          </div>
        </section>

        <section ref={detailRef} className="scroll-mt-24 rounded-md border border-[var(--border)] bg-[var(--surface)] p-5">
          {selected ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Chi tiết yêu cầu</p>
                  <h3 className="mt-1 text-xl font-semibold">{selected.fullName || "Khách chưa nhập tên"}</h3>
                  <a href={`tel:${selected.phone}`} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                    <PhoneCall className="h-4 w-4" aria-hidden="true" />
                    {selected.phone}
                  </a>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusMeta[selected.status].className}`}>{statusMeta[selected.status].label}</span>
              </div>

              <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
                <p className="text-sm font-semibold">Nội dung khách gửi</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-soft)]">{selected.message || "Không có nội dung"}</p>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-[var(--text-soft)]">Trạng thái xử lý</span>
                <select value={editStatus} onChange={(event) => setEditStatus(event.target.value as ConsultationStatus)} className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]">
                  {statusOptions.filter((option) => option.value).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[var(--text-soft)]">Ghi chú nội bộ</span>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} placeholder="Ví dụ: Đã gọi lần 1, khách muốn tư vấn khoa tim mạch..." className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]" />
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => void updateRequest()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Lưu xử lý
                </button>
                {canDelete ? (
                  <button type="button" onClick={() => void deleteRequest()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-md border border-[#f2b8b5] px-4 py-2 text-sm font-semibold text-[#b3261e] hover:bg-[#fff3f2] disabled:opacity-60">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Xóa
                  </button>
                ) : null}
              </div>

              <p className="text-xs text-[var(--text-muted)]">Tạo lúc {formatDateTime(selected.createdAt)}. Cập nhật gần nhất {formatDateTime(selected.updatedAt)}.</p>
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center">
              <MessageSquareText className="h-8 w-8 text-[var(--text-muted)]" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">Chọn một yêu cầu tư vấn</h3>
              <p className="mt-2 text-sm text-[var(--text-soft)]">Bấm Chi tiết trong danh sách để xem nội dung và cập nhật trạng thái xử lý.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
