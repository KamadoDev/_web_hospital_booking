"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatVietnamDateTime } from "@/lib/date";
import type { ListResult, MediaAsset } from "@/lib/types";

type CleanupResult = {
  olderThan: string;
  scanned: number;
  deletedCount: number;
  failedCount: number;
  deleted: MediaAsset[];
  failed: { id: string; publicId: string; message: string }[];
};

const statusOptions = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Chưa sử dụng", value: "false" },
  { label: "Đang sử dụng", value: "true" },
];

const folderOptions = [
  { label: "Tất cả thư mục", value: "" },
  { label: "Chuyên khoa", value: "hospital/departments" },
  { label: "Người dùng", value: "hospital/users" },
  { label: "Bác sĩ", value: "hospital/doctors" },
  { label: "Gói khám", value: "hospital/packages" },
  { label: "Kết quả y tế", value: "hospital/medical-results" },
  { label: "Cấu hình website", value: "hospital/site-settings" },
  { label: "Banner", value: "hospital/banners" },
];

const formatBytes = (value: number | null) => {
  if (!value) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

const formatDateTime = (value: string) => formatVietnamDateTime(value);

export default function UploadsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "STAFF";
  const canDelete = user?.role === "ADMIN";
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isUsed, setIsUsed] = useState("false");
  const [folder, setFolder] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [olderThanHours, setOlderThanHours] = useState("24");
  const [cleanupLimit, setCleanupLimit] = useState("50");
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);

  const query = useMemo(
    () => ({
      isUsed: isUsed || undefined,
      folder: folder || undefined,
      page,
      limit: 20,
    }),
    [folder, isUsed, page],
  );

  const loadAssets = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest<ListResult<MediaAsset>>("/uploads/images", { query });
      setAssets(result.items);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách ảnh upload");
    } finally {
      setLoading(false);
    }
  }, [canManage, query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadAssets(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadAssets]);

  useEffect(() => {
    if (!notice && !error) return;
    const timeoutId = window.setTimeout(() => {
      setNotice("");
      setError("");
    }, 4500);
    return () => window.clearTimeout(timeoutId);
  }, [error, notice]);

  const deleteAsset = async () => {
    if (!deleteTarget || !canDelete) return;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await apiRequest<MediaAsset>(`/uploads/images/${deleteTarget.id}`, { method: "DELETE" });
      setNotice("Đã xoá ảnh chưa sử dụng");
      setDeleteTarget(null);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xoá được ảnh");
    } finally {
      setBusy(false);
    }
  };

  const cleanupUnused = async () => {
    if (!canDelete) return;
    setBusy(true);
    setError("");
    setNotice("");
    setCleanupResult(null);

    try {
      const result = await apiRequest<CleanupResult>("/uploads/images/cleanup-unused", {
        method: "POST",
        body: {
          olderThanHours: Number(olderThanHours || 24),
          limit: Number(cleanupLimit || 50),
        },
      });
      setCleanupResult(result);
      setNotice(`Đã dọn ${result.deletedCount} ảnh chưa sử dụng`);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không dọn được ảnh chưa sử dụng");
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Đã sao chép URL ảnh");
    } catch {
      setError("Trình duyệt không cho phép sao chép URL");
    }
  };

  if (!canManage) {
    return (
      <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm font-medium text-[var(--text-muted)]">Upload</p>
        <h2 className="mt-1 text-2xl font-semibold">Thư viện ảnh upload</h2>
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
            <p className="text-sm font-medium text-[var(--text-muted)]">Upload</p>
            <h2 className="mt-1 text-2xl font-semibold">Thư viện ảnh upload</h2>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Theo dõi ảnh đã dùng, ảnh tạm chưa gắn với dữ liệu và dọn ảnh thừa trên Cloudinary.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[180px_220px_auto]">
            <select value={isUsed} onChange={(event) => { setIsUsed(event.target.value); setPage(1); }} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]">
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={folder} onChange={(event) => { setFolder(event.target.value); setPage(1); }} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]">
              {folderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <button type="button" onClick={() => void loadAssets()} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-soft)] hover:bg-[var(--surface-soft)]">Tải lại</button>
          </div>
        </div>
      </section>

      {canDelete ? (
        <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_160px_auto] lg:items-end">
            <div>
              <h3 className="font-semibold">Dọn ảnh chưa sử dụng</h3>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                Chỉ xoá ảnh có `isUsed=false` và cũ hơn thời gian chỉ định. Ảnh đang dùng sẽ bị backend chặn xoá.
              </p>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-[var(--text-soft)]">Cũ hơn</span>
              <div className="mt-1 flex rounded-md border border-[var(--border)] bg-[var(--surface)]">
                <input value={olderThanHours} onChange={(event) => setOlderThanHours(event.target.value.replace(/\D/g, ""))} inputMode="numeric" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
                <span className="border-l border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)]">giờ</span>
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[var(--text-soft)]">Giới hạn</span>
              <input value={cleanupLimit} onChange={(event) => setCleanupLimit(event.target.value.replace(/\D/g, ""))} inputMode="numeric" className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]" />
            </label>
            <button type="button" disabled={busy} onClick={() => void cleanupUnused()} className="rounded-md bg-[#b3261e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8c1d18] disabled:opacity-60">
              {busy ? "Đang xử lý..." : "Dọn ảnh thừa"}
            </button>
          </div>
          {cleanupResult ? (
            <div className="mt-4 rounded-md border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-soft)]">
              Đã quét {cleanupResult.scanned} ảnh, xoá {cleanupResult.deletedCount} ảnh, lỗi {cleanupResult.failedCount} ảnh.
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-md border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-col gap-2 border-b border-[var(--border-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Danh sách ảnh</h3>
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              Tổng {pagination.total} ảnh, trang {pagination.page}/{pagination.totalPages || 1}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">Trước</button>
            <button type="button" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:opacity-50">Sau</button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--text-soft)]">Đang tải ảnh upload...</div>
        ) : assets.length ? (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <article key={asset.id} className="overflow-hidden rounded-md border border-[var(--border-soft)] bg-[var(--surface)]">
                <div className="aspect-[16/10] bg-[var(--surface-muted)]">
                  <img src={asset.url} alt={asset.publicId} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${asset.isUsed ? "bg-[#e7f6ed] text-[#1f7a3a]" : "bg-[#fff7ed] text-[#9a3412]"}`}>
                      {asset.isUsed ? "Đang sử dụng" : "Chưa sử dụng"}
                    </span>
                    <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--text-soft)]">{asset.format || "image"}</span>
                    <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--text-soft)]">{formatBytes(asset.bytes)}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="truncate font-medium" title={asset.publicId}>{asset.publicId}</p>
                    <p className="truncate text-[var(--text-soft)]" title={asset.folder}>{asset.folder}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {asset.width || "-"} x {asset.height || "-"} px - {formatDateTime(asset.createdAt)}
                    </p>
                    {asset.ownerType ? <p className="truncate text-xs text-[var(--text-muted)]">Owner: {asset.ownerType} / {asset.ownerId}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void copyUrl(asset.url)} className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-soft)] hover:bg-[var(--surface-soft)]">Copy URL</button>
                    <a href={asset.url} target="_blank" rel="noreferrer" className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-soft)] hover:bg-[var(--surface-soft)]">Mở ảnh</a>
                    {canDelete && !asset.isUsed ? (
                      <button type="button" onClick={() => setDeleteTarget(asset)} className="rounded-md border border-[#f2b8b5] px-3 py-1.5 text-xs font-medium text-[#b3261e] hover:bg-[#fff3f2]">Xoá</button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-[var(--text-soft)]">Không có ảnh phù hợp bộ lọc.</div>
        )}
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[#b3261e]">Xoá ảnh chưa sử dụng?</h3>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Ảnh sẽ bị xoá khỏi Cloudinary và bảng MediaAsset. Thao tác này không áp dụng cho ảnh đang sử dụng.
            </p>
            <div className="mt-4 overflow-hidden rounded-md border border-[var(--border-soft)]">
              <img src={deleteTarget.url} alt={deleteTarget.publicId} className="h-40 w-full object-cover" />
            </div>
            <p className="mt-3 truncate text-xs text-[var(--text-muted)]">{deleteTarget.publicId}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium">Huỷ</button>
              <button type="button" disabled={busy} onClick={() => void deleteAsset()} className="rounded-md bg-[#b3261e] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {busy ? "Đang xoá..." : "Xoá ảnh"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
