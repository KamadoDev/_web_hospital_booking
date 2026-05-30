"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Invoice, InvoiceStatus, ListResult, PaymentMethod } from "@/lib/types";

const statusOptions: { value: "" | InvoiceStatus; label: string }[] = [
  { value: "", label: "Tat ca trang thai" },
  { value: "UNPAID", label: "Chua thanh toan" },
  { value: "PAID", label: "Da thanh toan" },
  { value: "CANCELLED", label: "Da huy" },
  { value: "REFUNDED", label: "Da hoan tien" },
];

const paymentOptions: { value: "" | PaymentMethod; label: string }[] = [
  { value: "", label: "Tat ca phuong thuc" },
  { value: "CASH", label: "Tien mat" },
  { value: "CARD", label: "The" },
  { value: "BANK_TRANSFER", label: "Chuyen khoan" },
  { value: "OTHER", label: "Khac" },
];

const manualPayments: { value: Exclude<PaymentMethod, "MOMO" | "VNPAY">; label: string }[] = [
  { value: "CASH", label: "Tien mat" },
  { value: "CARD", label: "The" },
  { value: "BANK_TRANSFER", label: "Chuyen khoan" },
  { value: "OTHER", label: "Khac" },
];

const statusLabel: Record<InvoiceStatus, string> = {
  UNPAID: "Chua thanh toan",
  PAID: "Da thanh toan",
  CANCELLED: "Da huy",
  REFUNDED: "Da hoan tien",
};

const statusClass: Record<InvoiceStatus, string> = {
  UNPAID: "bg-[#fff4d6] text-[#8a5a00]",
  PAID: "bg-[#e7f6ed] text-[#1f7a3a]",
  CANCELLED: "bg-[#fff3f2] text-[#b3261e]",
  REFUNDED: "bg-[#eef2f7] text-[#667892]",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN").format(new Date(value));

const parseMoneyInput = (value: string) => value.replace(/\D/g, "");

const formatMoneyInput = (value: string) => {
  const digits = parseMoneyInput(value);
  return digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "";
};

const doctorName = (invoice: Invoice) =>
  [invoice.appointment.doctor.title, invoice.appointment.doctor.user.fullName]
    .filter(Boolean)
    .join(" ");

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [phone, setPhone] = useState("");
  const [invoiceCode, setInvoiceCode] = useState("");
  const [barcode, setBarcode] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [appointmentId, setAppointmentId] = useState("");
  const [bhytDiscount, setBhytDiscount] = useState("");
  const listRef = useRef<HTMLElement | null>(null);
  const detailRef = useRef<HTMLElement | null>(null);

  const canUse = user?.role === "ADMIN" || user?.role === "STAFF";
  const canRefund = user?.role === "ADMIN";

  const query = useMemo(
    () => ({
      status: status || undefined,
      paymentMethod: paymentMethod || undefined,
      phone: phone.trim() || undefined,
      invoiceCode: invoiceCode.trim() || undefined,
      barcode: barcode.trim() || undefined,
      page,
      limit: 20,
    }),
    [barcode, invoiceCode, page, paymentMethod, phone, status],
  );

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<ListResult<Invoice>>("/dashboard/invoices", {
        query,
      });
      setInvoices(result.items);
      setPagination(result.pagination);
      setSelected((current) =>
        current ? result.items.find((item) => item.id === current.id) || current : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc hoa don");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInvoices();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadInvoices]);

  useEffect(() => {
    if (!notice && !error) return;
    const timeoutId = window.setTimeout(() => {
      setNotice("");
      setError("");
    }, 4500);
    return () => window.clearTimeout(timeoutId);
  }, [error, notice]);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const createInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUse) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const invoice = await apiRequest<Invoice>(`/dashboard/invoices/appointments/${appointmentId}`, {
        method: "POST",
        body: {
          bhytDiscount: bhytDiscount ? Number(bhytDiscount) : undefined,
        },
      });
      setSelected(invoice);
      setAppointmentId("");
      setBhytDiscount("");
      setNotice("Da tao hoa don");
      await loadInvoices();
      scrollTo(detailRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tao duoc hoa don");
    } finally {
      setBusy(false);
    }
  };

  const payInvoice = async (invoice: Invoice) => {
    const method = window.prompt(
      "Nhap phuong thuc thanh toan: CASH, CARD, BANK_TRANSFER, OTHER",
      "CASH",
    ) as PaymentMethod | null;
    if (!method || !manualPayments.some((item) => item.value === method)) return;

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<Invoice>(`/dashboard/invoices/${invoice.id}/pay`, {
        method: "PATCH",
        body: { paymentMethod: method },
      });
      setSelected(updated);
      setNotice("Da thanh toan hoa don");
      await loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong thanh toan duoc hoa don");
    } finally {
      setBusy(false);
    }
  };

  const simpleAction = async (invoice: Invoice, path: string, message: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<Invoice>(`/dashboard/invoices/${invoice.id}${path}`, {
        method: "PATCH",
      });
      setSelected(updated);
      setNotice(message);
      await loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong thuc hien duoc thao tac");
    } finally {
      setBusy(false);
    }
  };

  const refundInvoice = async (invoice: Invoice) => {
    const refundReason = window.prompt("Nhap ly do hoan tien", "");

    if (!refundReason || refundReason.trim().length < 5) {
      setError("Ly do hoan tien phai co it nhat 5 ky tu");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const updated = await apiRequest<Invoice>(`/dashboard/invoices/${invoice.id}/refund`, {
        method: "PATCH",
        body: { refundReason: refundReason.trim() },
      });
      setSelected(updated);
      setNotice("Da hoan tien hoa don");
      await loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong hoan tien duoc hoa don");
    } finally {
      setBusy(false);
    }
  };

  const openDetail = (invoice: Invoice) => {
    setSelected(invoice);
    scrollTo(detailRef);
  };

  const renderActions = (invoice: Invoice) => (
    <>
      {invoice.status === "UNPAID" ? (
        <>
          <button disabled={busy} onClick={() => void payInvoice(invoice)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Thanh toan</button>
          <button disabled={busy} onClick={() => void simpleAction(invoice, "/cancel", "Da huy hoa don")} className="rounded-md border border-[#f2b8b5] px-3 py-1.5 text-xs font-medium text-[#b3261e]">Huy</button>
        </>
      ) : null}
      {canRefund && invoice.status === "PAID" ? (
        <button disabled={busy} onClick={() => void refundInvoice(invoice)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Hoan tien</button>
      ) : null}
    </>
  );

  if (!canUse) {
    return (
      <section className="rounded-md border border-[#dce3ee] bg-white p-6">
        <p className="text-sm font-medium text-[#55708f]">Tai chinh</p>
        <h2 className="mt-1 text-2xl font-semibold">Hoa don</h2>
        <p className="mt-2 text-sm text-[#667892]">Module hoa don chi danh cho ADMIN va STAFF.</p>
      </section>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      {notice || error ? (
        <div className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-md sm:right-6 sm:top-6">
          <div className={`rounded-md border px-4 py-3 shadow-lg ${error ? "border-[#f2b8b5] bg-[#fff3f2] text-[#b3261e]" : "border-[#a8dab5] bg-[#f0fff4] text-[#1f7a3a]"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{error ? "Co loi xay ra" : "Thanh cong"}</p>
                <p className="mt-1 text-sm">{error || notice}</p>
              </div>
              <button type="button" onClick={() => { setError(""); setNotice(""); }} className="rounded-md px-2 text-lg leading-none opacity-70 hover:bg-black/5 hover:opacity-100" aria-label="Dong thong bao">x</button>
            </div>
          </div>
        </div>
      ) : null}

      <section ref={listRef} className="min-w-0 scroll-mt-24 space-y-4">
        <div className="rounded-md border border-[#dce3ee] bg-white p-5">
          <p className="text-sm font-medium text-[#55708f]">Tai chinh</p>
          <h2 className="mt-1 text-2xl font-semibold">Hoa don</h2>
          <p className="mt-2 text-sm text-[#667892]">Tao hoa don tu lich hen da hoan thanh va ghi nhan thanh toan thu cong.</p>
        </div>

        <div className="rounded-md border border-[#dce3ee] bg-white">
          <div className="grid gap-3 border-b border-[#e5ebf3] p-4 lg:grid-cols-[170px_170px_1fr_1fr_1fr]">
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              {paymentOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <input value={phone} onChange={(e) => { setPhone(e.target.value); setPage(1); }} placeholder="So dien thoai" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
            <input value={invoiceCode} onChange={(e) => { setInvoiceCode(e.target.value); setPage(1); }} placeholder="Ma hoa don" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
            <input value={barcode} onChange={(e) => { setBarcode(e.target.value); setPage(1); }} placeholder="Barcode" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#667892]">
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Hoa don</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Benh nhan</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Lich hen</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">So tien</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Trang thai</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 text-right font-semibold">Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Dang tai hoa don...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Chua co hoa don phu hop</td></tr>
                ) : invoices.map((invoice) => (
                  <tr key={invoice.id} className="align-top">
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <button onClick={() => openDetail(invoice)} className="font-semibold text-[#0d4f8b] hover:underline">{invoice.invoiceCode}</button>
                      <p className="mt-1 text-xs text-[#667892]">{invoice.barcode}</p>
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><p className="font-semibold">{invoice.patient.fullName}</p><p className="mt-1 text-xs text-[#667892]">{invoice.patient.phone}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><p>{invoice.appointment.bookingCode}</p><p className="mt-1 text-xs text-[#667892]">{formatDate(invoice.appointment.appointmentDate)} {invoice.appointment.startTime}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><p className="font-semibold">{formatCurrency(invoice.finalAmount)}</p><p className="mt-1 text-xs text-[#667892]">Giam {formatCurrency(invoice.bhytDiscount)}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClass[invoice.status]}`}>{statusLabel[invoice.status]}</span><p className="mt-1 text-xs text-[#667892]">{invoice.paymentMethod || "-"}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => openDetail(invoice)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Chi tiet</button>
                        {renderActions(invoice)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#e5ebf3] px-4 py-3 text-sm text-[#667892]">
            <span>{pagination.total} ket qua, trang {pagination.page}/{pagination.totalPages || 1}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Truoc</button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Sau</button>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-md border border-[#dce3ee] bg-white p-5">
          <h3 className="text-lg font-semibold">Tao hoa don</h3>
          <p className="mt-2 text-sm leading-6 text-[#667892]">Backend chi cho tao hoa don tu lich hen da hoan thanh kham.</p>
          <form className="mt-5 space-y-4" onSubmit={createInvoice}>
            <label className="block">
              <span className="text-sm font-medium text-[#334155]">Appointment ID</span>
              <input value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} placeholder="UUID lich hen da COMPLETED" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#334155]">Giam tru BHYT</span>
              <input value={formatMoneyInput(bhytDiscount)} onChange={(e) => setBhytDiscount(parseMoneyInput(e.target.value))} placeholder="0" inputMode="numeric" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
            </label>
            <button disabled={busy} className="w-full rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60">{busy ? "Dang tao..." : "Tao hoa don"}</button>
          </form>
        </section>

        <section ref={detailRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5 xl:sticky xl:top-24">
          {selected ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-[#55708f]">Chi tiet hoa don</p>
                <h3 className="mt-1 text-xl font-semibold">{selected.invoiceCode}</h3>
                <span className={`mt-3 inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusClass[selected.status]}`}>{statusLabel[selected.status]}</span>
              </div>
              <div className="space-y-3 text-sm">
                <div><p className="text-[#667892]">Barcode</p><p className="font-semibold">{selected.barcode}</p></div>
                <div><p className="text-[#667892]">Benh nhan</p><p className="font-semibold">{selected.patient.fullName}</p><p>{selected.patient.phone || "-"}</p></div>
                <div><p className="text-[#667892]">Lich hen</p><p className="font-semibold">{selected.appointment.bookingCode}</p><p>{formatDate(selected.appointment.appointmentDate)} {selected.appointment.startTime} - {selected.appointment.endTime}</p></div>
                <div><p className="text-[#667892]">Bac si</p><p className="font-semibold">{doctorName(selected)}</p><p>{selected.appointment.department.name}</p></div>
                <div><p className="text-[#667892]">Dich vu</p><p>{selected.appointment.package?.name || "Kham bac si"}</p></div>
                <div><p className="text-[#667892]">Tien</p><p>Tong: {formatCurrency(selected.totalAmount)}</p><p>Giam BHYT: {formatCurrency(selected.bhytDiscount)}</p><p className="font-semibold">Can thu: {formatCurrency(selected.finalAmount)}</p></div>
                <div><p className="text-[#667892]">Thanh toan</p><p>{selected.paymentMethod || "Chua thanh toan"}</p><p>{selected.paidAt ? formatDate(selected.paidAt) : "-"}</p></div>
                {selected.status === "REFUNDED" ? (
                  <div>
                    <p className="text-[#667892]">Hoan tien</p>
                    <p>{selected.refundReason || "-"}</p>
                    <p className="text-xs text-[#667892]">
                      {selected.refundedAt ? formatDate(selected.refundedAt) : "-"}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 border-t border-[#e5ebf3] pt-4">{renderActions(selected)}</div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-[#55708f]">Chi tiet hoa don</p>
              <h3 className="mt-1 text-xl font-semibold">Chon mot hoa don</h3>
              <p className="mt-2 text-sm leading-6 text-[#667892]">Bam vao ma hoa don de xem barcode, so tien va thao tac thanh toan.</p>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
