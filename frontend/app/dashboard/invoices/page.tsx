"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatVietnamDate } from "@/lib/date";
import type { InsuranceRouteType, Invoice, InvoiceStatus, ListResult, PaymentMethod } from "@/lib/types";

type InvoiceAction = "pay" | "cancel" | "refund" | "adjust";
type InsuranceForm = {
  eligibleAmount: string;
  coverageRate: string;
  routeType: InsuranceRouteType;
  note: string;
};

const statusOptions: { value: "" | InvoiceStatus; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "UNPAID", label: "Chưa thanh toán" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "REFUNDED", label: "Đã hoàn tiền" },
];

const paymentOptions: { value: "" | PaymentMethod; label: string }[] = [
  { value: "", label: "Tất cả phương thức" },
  { value: "CASH", label: "Tiền mặt" },
  { value: "CARD", label: "Thẻ" },
  { value: "BANK_TRANSFER", label: "Chuyển khoản" },
  { value: "OTHER", label: "Khác" },
];

const manualPayments: { value: Exclude<PaymentMethod, "MOMO" | "VNPAY">; label: string }[] = [
  { value: "CASH", label: "Tiền mặt" },
  { value: "CARD", label: "Thẻ" },
  { value: "BANK_TRANSFER", label: "Chuyển khoản" },
  { value: "OTHER", label: "Khác" },
];

const insuranceCoverageOptions = ["0", "80", "95", "100"];

const insuranceRouteOptions: { value: InsuranceRouteType; label: string }[] = [
  { value: "RIGHT_ROUTE", label: "Đúng tuyến" },
  { value: "WRONG_ROUTE", label: "Trái tuyến" },
  { value: "REFERRAL", label: "Chuyển tuyến" },
  { value: "EMERGENCY", label: "Cấp cứu" },
  { value: "SERVICE", label: "Dịch vụ" },
];

const defaultInsuranceForm: InsuranceForm = {
  eligibleAmount: "",
  coverageRate: "80",
  routeType: "RIGHT_ROUTE",
  note: "",
};

const insuranceRouteLabel: Record<InsuranceRouteType, string> = {
  RIGHT_ROUTE: "Đúng tuyến",
  WRONG_ROUTE: "Trái tuyến",
  REFERRAL: "Chuyển tuyến",
  EMERGENCY: "Cấp cứu",
  SERVICE: "Dịch vụ",
};

const statusLabel: Record<InvoiceStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

const paymentLabel: Partial<Record<PaymentMethod, string>> = {
  CASH: "Tiền mặt",
  CARD: "Thẻ",
  BANK_TRANSFER: "Chuyển khoản",
  MOMO: "MoMo",
  VNPAY: "VNPay",
  OTHER: "Khác",
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

const formatDate = (value: string) => formatVietnamDate(value);

const parseMoneyInput = (value: string) => value.replace(/\D/g, "");

const formatMoneyInput = (value: string) => {
  const digits = parseMoneyInput(value);
  return digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "";
};

const toMoneyNumber = (value: string) => Number(parseMoneyInput(value) || 0);

const calculateInsuranceDiscount = (form: InsuranceForm) =>
  Math.floor((toMoneyNumber(form.eligibleAmount) * Number(form.coverageRate || 0)) / 100);

const buildInsuranceForm = (invoice: Invoice): InsuranceForm => ({
  eligibleAmount: invoice.insuranceEligibleAmount ? String(invoice.insuranceEligibleAmount) : "",
  coverageRate: String(invoice.insuranceCoverageRate || 80),
  routeType: invoice.insuranceRouteType || "RIGHT_ROUTE",
  note: invoice.insuranceNote || "",
});

const buildInsurancePayload = (form: InsuranceForm) => {
  const eligibleAmount = toMoneyNumber(form.eligibleAmount);

  return {
    insuranceEligibleAmount: eligibleAmount,
    insuranceCoverageRate: eligibleAmount > 0 ? Number(form.coverageRate || 0) : 0,
    insuranceRouteType: eligibleAmount > 0 ? form.routeType : null,
    insuranceNote: eligibleAmount > 0 ? form.note.trim() || null : null,
  };
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
  const [insuranceForm, setInsuranceForm] = useState<InsuranceForm>(defaultInsuranceForm);
  const [actionTarget, setActionTarget] = useState<{ type: InvoiceAction; invoice: Invoice } | null>(null);
  const [payMethod, setPayMethod] = useState<Exclude<PaymentMethod, "MOMO" | "VNPAY">>("CASH");
  const [adjustInsuranceForm, setAdjustInsuranceForm] = useState<InsuranceForm>(defaultInsuranceForm);
  const [refundReason, setRefundReason] = useState("");
  const listRef = useRef<HTMLElement | null>(null);
  const createRef = useRef<HTMLElement | null>(null);
  const detailRef = useRef<HTMLElement | null>(null);

  const canUse = user?.role === "ADMIN" || user?.role === "STAFF";
  const canRefund = user?.role === "ADMIN";
  const createDiscount = calculateInsuranceDiscount(insuranceForm);
  const adjustedDiscount = calculateInsuranceDiscount(adjustInsuranceForm);
  const adjustedFinalAmount = actionTarget?.type === "adjust"
    ? Math.max(actionTarget.invoice.totalAmount - adjustedDiscount, 0)
    : 0;

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
      const result = await apiRequest<ListResult<Invoice>>("/dashboard/invoices", { query });
      setInvoices(result.items);
      setPagination(result.pagination);
      setSelected((current) =>
        current ? result.items.find((item) => item.id === current.id) || current : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được hóa đơn");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadInvoices(), 0);
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const appointmentCode = params.get("appointment") || params.get("appointmentId") || params.get("bookingCode");
      const initialInvoiceCode = params.get("invoiceCode");

      if (appointmentCode) {
        setAppointmentId(appointmentCode.trim().toUpperCase());
        scrollTo(createRef);
      }

      if (initialInvoiceCode) {
        setInvoiceCode(initialInvoiceCode.trim().toUpperCase());
        setPage(1);
        scrollTo(listRef);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const createInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUse) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const invoice = await apiRequest<Invoice>(`/dashboard/invoices/appointments/${appointmentId}`, {
        method: "POST",
        body: buildInsurancePayload(insuranceForm),
      });
      setSelected(invoice);
      setAppointmentId("");
      setInsuranceForm(defaultInsuranceForm);
      setNotice("Đã tạo hóa đơn");
      await loadInvoices();
      scrollTo(detailRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được hóa đơn");
    } finally {
      setBusy(false);
    }
  };

  const openDetail = (invoice: Invoice) => {
    setSelected(invoice);
    setActionTarget(null);
    setRefundReason("");
    setAdjustInsuranceForm(defaultInsuranceForm);
    setPayMethod("CASH");
    scrollTo(detailRef);
  };

  const startAction = (type: InvoiceAction, invoice: Invoice) => {
    setSelected(invoice);
    setActionTarget({ type, invoice });
    setRefundReason("");
    setAdjustInsuranceForm(type === "adjust" ? buildInsuranceForm(invoice) : defaultInsuranceForm);
    setPayMethod("CASH");
    setError("");
    setNotice("");
    scrollTo(detailRef);
  };

  const updateSelectedInvoice = async (invoice: Invoice, message: string) => {
    setSelected(invoice);
    setActionTarget(null);
    setRefundReason("");
    setAdjustInsuranceForm(defaultInsuranceForm);
    setNotice(message);
    await loadInvoices();
    scrollTo(detailRef);
  };

  const payInvoice = async () => {
    if (!actionTarget || actionTarget.type !== "pay") return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<Invoice>(`/dashboard/invoices/${actionTarget.invoice.id}/pay`, {
        method: "PATCH",
        body: { paymentMethod: payMethod },
      });
      await updateSelectedInvoice(updated, "Đã thanh toán hóa đơn");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thanh toán được hóa đơn");
    } finally {
      setBusy(false);
    }
  };

  const cancelInvoice = async () => {
    if (!actionTarget || actionTarget.type !== "cancel") return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<Invoice>(`/dashboard/invoices/${actionTarget.invoice.id}/cancel`, {
        method: "PATCH",
      });
      await updateSelectedInvoice(updated, "Đã hủy hóa đơn");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không hủy được hóa đơn");
    } finally {
      setBusy(false);
    }
  };

  const adjustInvoice = async () => {
    if (!actionTarget || actionTarget.type !== "adjust") return;
    if (adjustedDiscount > actionTarget.invoice.totalAmount) {
      setError("Giảm trừ BHYT không được lớn hơn tổng tiền");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<Invoice>(`/dashboard/invoices/${actionTarget.invoice.id}`, {
        method: "PATCH",
        body: buildInsurancePayload(adjustInsuranceForm),
      });
      await updateSelectedInvoice(
        updated,
        actionTarget.invoice.status === "CANCELLED"
          ? "Đã điều chỉnh và mở lại hóa đơn"
          : "Đã điều chỉnh hóa đơn",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không điều chỉnh được hóa đơn");
    } finally {
      setBusy(false);
    }
  };

  const refundInvoice = async () => {
    if (!actionTarget || actionTarget.type !== "refund") return;
    if (refundReason.trim().length < 5) {
      setError("Lý do hoàn tiền phải có ít nhất 5 ký tự");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<Invoice>(`/dashboard/invoices/${actionTarget.invoice.id}/refund`, {
        method: "PATCH",
        body: { refundReason: refundReason.trim() },
      });
      await updateSelectedInvoice(updated, "Đã hoàn tiền hóa đơn");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không hoàn tiền được hóa đơn");
    } finally {
      setBusy(false);
    }
  };

  const renderActions = (invoice: Invoice) => (
    <>
      {invoice.status === "UNPAID" ? (
        <>
          <button disabled={busy} onClick={() => startAction("adjust", invoice)} className="rounded-md border border-[#cfe4fa] px-3 py-1.5 text-xs font-medium text-[#0d4f8b]">Chỉnh giảm</button>
          <button disabled={busy} onClick={() => startAction("pay", invoice)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Thanh toán</button>
          <button disabled={busy} onClick={() => startAction("cancel", invoice)} className="rounded-md border border-[#f2b8b5] px-3 py-1.5 text-xs font-medium text-[#b3261e]">Hủy</button>
        </>
      ) : null}
      {invoice.status === "CANCELLED" ? (
        <button disabled={busy} onClick={() => startAction("adjust", invoice)} className="rounded-md border border-[#cfe4fa] px-3 py-1.5 text-xs font-medium text-[#0d4f8b]">Chỉnh và mở lại</button>
      ) : null}
      {canRefund && invoice.status === "PAID" ? (
        <button disabled={busy} onClick={() => startAction("refund", invoice)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Hoàn tiền</button>
      ) : null}
    </>
  );

  if (!canUse) {
    return (
      <section className="rounded-md border border-[#dce3ee] bg-white p-6">
        <p className="text-sm font-medium text-[#55708f]">Tài chính</p>
        <h2 className="mt-1 text-2xl font-semibold">Hóa đơn</h2>
        <p className="mt-2 text-sm text-[#667892]">Module hóa đơn chỉ dành cho ADMIN và STAFF.</p>
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
                <p className="text-sm font-semibold">{error ? "Có lỗi xảy ra" : "Thành công"}</p>
                <p className="mt-1 text-sm">{error || notice}</p>
              </div>
              <button type="button" onClick={() => { setError(""); setNotice(""); }} className="rounded-md px-2 text-lg leading-none opacity-70 hover:bg-black/5 hover:opacity-100" aria-label="Đóng thông báo">x</button>
            </div>
          </div>
        </div>
      ) : null}

      <section ref={listRef} className="min-w-0 scroll-mt-24 space-y-4">
        <div className="rounded-md border border-[#dce3ee] bg-white p-5">
          <p className="text-sm font-medium text-[#55708f]">Tài chính</p>
          <h2 className="mt-1 text-2xl font-semibold">Hóa đơn</h2>
          <p className="mt-2 text-sm text-[#667892]">Tạo hóa đơn từ lịch hẹn đã hoàn thành và ghi nhận thanh toán thủ công.</p>
        </div>

        <div className="rounded-md border border-[#dce3ee] bg-white">
          <div className="grid gap-3 border-b border-[#e5ebf3] p-4 lg:grid-cols-[170px_170px_1fr_1fr_1fr]">
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              {paymentOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <input value={phone} onChange={(e) => { setPhone(e.target.value); setPage(1); }} placeholder="Số điện thoại" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
            <input value={invoiceCode} onChange={(e) => { setInvoiceCode(e.target.value); setPage(1); }} placeholder="Mã hóa đơn" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
            <input value={barcode} onChange={(e) => { setBarcode(e.target.value); setPage(1); }} placeholder="Barcode" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#667892]">
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Hóa đơn</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Bệnh nhân</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Lịch hẹn</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Số tiền</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Đang tải hóa đơn...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Chưa có hóa đơn phù hợp</td></tr>
                ) : invoices.map((invoice) => (
                  <tr key={invoice.id} className="align-top">
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <button onClick={() => openDetail(invoice)} className="font-semibold text-[#0d4f8b] hover:underline">{invoice.invoiceCode}</button>
                      <p className="mt-1 text-xs text-[#667892]">{invoice.barcode}</p>
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><p className="font-semibold">{invoice.patient.fullName}</p><p className="mt-1 text-xs text-[#667892]">{invoice.patient.phone}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><p>{invoice.appointment.bookingCode}</p><p className="mt-1 text-xs text-[#667892]">{formatDate(invoice.appointment.appointmentDate)} {invoice.appointment.startTime}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><p className="font-semibold">{formatCurrency(invoice.finalAmount)}</p><p className="mt-1 text-xs text-[#667892]">Giảm {formatCurrency(invoice.bhytDiscount)}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClass[invoice.status]}`}>{statusLabel[invoice.status]}</span><p className="mt-1 text-xs text-[#667892]">{invoice.paymentMethod ? paymentLabel[invoice.paymentMethod] || invoice.paymentMethod : "-"}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => openDetail(invoice)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Chi tiết</button>
                        {renderActions(invoice)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#e5ebf3] px-4 py-3 text-sm text-[#667892]">
            <span>{pagination.total} kết quả, trang {pagination.page}/{pagination.totalPages || 1}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Trước</button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Sau</button>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section ref={createRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5">
          <h3 className="text-lg font-semibold">Tạo hóa đơn</h3>
          <p className="mt-2 text-sm leading-6 text-[#667892]">Có thể nhập mã lịch hiển thị trên bảng, ví dụ BK..., hoặc UUID lịch hẹn đã hoàn thành khám.</p>
          <form className="mt-5 space-y-4" onSubmit={createInvoice}>
            <label className="block">
              <span className="text-sm font-medium text-[#334155]">Mã lịch hẹn</span>
              <input value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} placeholder="Mã lịch BK... hoặc UUID" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required />
            </label>
            <div className="rounded-md border border-[#e5ebf3] bg-[#f8fafc] p-3">
              <p className="text-sm font-semibold text-[#172033]">Tính BHYT</p>
              <p className="mt-1 text-xs leading-5 text-[#667892]">Nhập phần tiền đủ điều kiện BHYT và mức hưởng, hệ thống sẽ tự tính giảm trừ.</p>
              <label className="mt-3 block">
                <span className="text-sm font-medium text-[#334155]">Số tiền đủ điều kiện</span>
                <input value={formatMoneyInput(insuranceForm.eligibleAmount)} onChange={(event) => setInsuranceForm((current) => ({ ...current, eligibleAmount: parseMoneyInput(event.target.value) }))} placeholder="0" inputMode="numeric" className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Mức hưởng</span>
                  <select value={insuranceForm.coverageRate} onChange={(event) => setInsuranceForm((current) => ({ ...current, coverageRate: event.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
                    {insuranceCoverageOptions.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[#334155]">Tuyến/loại</span>
                  <select value={insuranceForm.routeType} onChange={(event) => setInsuranceForm((current) => ({ ...current, routeType: event.target.value as InsuranceRouteType }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
                    {insuranceRouteOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="mt-3 block">
                <span className="text-sm font-medium text-[#334155]">Ghi chú BHYT</span>
                <textarea value={insuranceForm.note} onChange={(event) => setInsuranceForm((current) => ({ ...current, note: event.target.value }))} rows={2} placeholder="Ví dụ: áp dụng đúng tuyến theo thẻ BHYT" className="mt-1 w-full resize-none rounded-md border border-[#cfd8e6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
              </label>
              <div className="mt-3 flex justify-between rounded-md bg-white px-3 py-2 text-sm">
                <span className="text-[#667892]">Giảm BHYT dự kiến</span>
                <span className="font-semibold text-[#0d4f8b]">{formatCurrency(createDiscount)}</span>
              </div>
            </div>
            <button disabled={busy} className="w-full rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60">{busy ? "Đang tạo..." : "Tạo hóa đơn"}</button>
          </form>
        </section>

        <section ref={detailRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5 xl:sticky xl:top-24">
          {selected ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-[#55708f]">Chi tiết hóa đơn</p>
                <h3 className="mt-1 text-xl font-semibold">{selected.invoiceCode}</h3>
                <span className={`mt-3 inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusClass[selected.status]}`}>{statusLabel[selected.status]}</span>
              </div>
              <div className="space-y-3 text-sm">
                <div><p className="text-[#667892]">Barcode</p><p className="font-semibold">{selected.barcode}</p></div>
                <div><p className="text-[#667892]">Bệnh nhân</p><p className="font-semibold">{selected.patient.fullName}</p><p>{selected.patient.phone || "-"}</p></div>
                <div><p className="text-[#667892]">Lịch hẹn</p><p className="font-semibold">{selected.appointment.bookingCode}</p><p>{formatDate(selected.appointment.appointmentDate)} {selected.appointment.startTime} - {selected.appointment.endTime}</p></div>
                <div><p className="text-[#667892]">Bác sĩ</p><p className="font-semibold">{doctorName(selected)}</p><p>{selected.appointment.department.name}</p></div>
                <div><p className="text-[#667892]">Dịch vụ</p><p>{selected.appointment.package?.name || "Khám bác sĩ"}</p></div>
                <div><p className="text-[#667892]">Tiền</p><p>Tổng: {formatCurrency(selected.totalAmount)}</p><p>Giảm BHYT: {formatCurrency(selected.bhytDiscount)}</p><p className="font-semibold">Cần thu: {formatCurrency(selected.finalAmount)}</p></div>
                <div className="rounded-md border border-[#e5ebf3] bg-[#f8fafc] p-3">
                  <p className="font-semibold text-[#172033]">Tiêu chuẩn BHYT</p>
                  <p className="mt-2">Phần đủ điều kiện: {formatCurrency(selected.insuranceEligibleAmount)}</p>
                  <p>Mức hưởng: {selected.insuranceCoverageRate}%</p>
                  <p>Tuyến/loại: {selected.insuranceRouteType ? insuranceRouteLabel[selected.insuranceRouteType] : "-"}</p>
                  <p>Quỹ BHYT giảm: {formatCurrency(selected.insuranceDiscountAmount)}</p>
                  {selected.insuranceNote ? <p className="mt-1 text-[#667892]">Ghi chú: {selected.insuranceNote}</p> : null}
                </div>
                <div><p className="text-[#667892]">Thanh toán</p><p>{selected.paymentMethod ? paymentLabel[selected.paymentMethod] || selected.paymentMethod : "Chưa thanh toán"}</p><p>{selected.paidAt ? formatDate(selected.paidAt) : "-"}</p></div>
                {selected.status === "REFUNDED" ? (
                  <div><p className="text-[#667892]">Hoàn tiền</p><p>{selected.refundReason || "-"}</p><p className="text-xs text-[#667892]">{selected.refundedAt ? formatDate(selected.refundedAt) : "-"}</p></div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 border-t border-[#e5ebf3] pt-4">{renderActions(selected)}</div>
              {actionTarget?.invoice.id === selected.id ? (
                <div className="rounded-md border border-[#e5ebf3] bg-[#f8fafc] p-4">
                  {actionTarget.type === "pay" ? (
                    <>
                      <h4 className="font-semibold">Xác nhận thanh toán</h4>
                      <label className="mt-3 block">
                        <span className="text-sm font-medium text-[#334155]">Phương thức</span>
                        <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as Exclude<PaymentMethod, "MOMO" | "VNPAY">)} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
                          {manualPayments.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                      </label>
                      <div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => void payInvoice()} className="rounded-md bg-[#0d4f8b] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Xác nhận</button><button type="button" onClick={() => setActionTarget(null)} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]">Hủy</button></div>
                    </>
                  ) : null}
                  {actionTarget.type === "cancel" ? (
                    <>
                      <h4 className="font-semibold text-[#b3261e]">Xác nhận hủy hóa đơn</h4>
                      <p className="mt-2 text-sm text-[#667892]">Hóa đơn chưa thanh toán sẽ chuyển sang trạng thái đã hủy.</p>
                      <div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => void cancelInvoice()} className="rounded-md bg-[#b3261e] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Xác nhận hủy</button><button type="button" onClick={() => setActionTarget(null)} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]">Giữ hóa đơn</button></div>
                    </>
                  ) : null}
                  {actionTarget.type === "adjust" ? (
                    <>
                      <h4 className="font-semibold">{actionTarget.invoice.status === "CANCELLED" ? "Chỉnh và mở lại hóa đơn" : "Chỉnh giảm BHYT"}</h4>
                      <p className="mt-2 text-sm leading-6 text-[#667892]">Chỉ áp dụng cho hóa đơn chưa thanh toán. Nếu hóa đơn đang bị hủy, lưu điều chỉnh sẽ đưa hóa đơn về trạng thái chưa thanh toán.</p>
                      <label className="mt-3 block">
                        <span className="text-sm font-medium text-[#334155]">Số tiền đủ điều kiện BHYT</span>
                        <input value={formatMoneyInput(adjustInsuranceForm.eligibleAmount)} onChange={(event) => setAdjustInsuranceForm((current) => ({ ...current, eligibleAmount: parseMoneyInput(event.target.value) }))} placeholder="0" inputMode="numeric" className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                      </label>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-sm font-medium text-[#334155]">Mức hưởng</span>
                          <select value={adjustInsuranceForm.coverageRate} onChange={(event) => setAdjustInsuranceForm((current) => ({ ...current, coverageRate: event.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
                            {insuranceCoverageOptions.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-sm font-medium text-[#334155]">Tuyến/loại</span>
                          <select value={adjustInsuranceForm.routeType} onChange={(event) => setAdjustInsuranceForm((current) => ({ ...current, routeType: event.target.value as InsuranceRouteType }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
                            {insuranceRouteOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                          </select>
                        </label>
                      </div>
                      <label className="mt-3 block">
                        <span className="text-sm font-medium text-[#334155]">Ghi chú BHYT</span>
                        <textarea value={adjustInsuranceForm.note} onChange={(event) => setAdjustInsuranceForm((current) => ({ ...current, note: event.target.value }))} rows={2} className="mt-1 w-full resize-none rounded-md border border-[#cfd8e6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                      </label>
                      <div className="mt-3 rounded-md border border-[#e5ebf3] bg-white p-3 text-sm">
                        <div className="flex justify-between gap-3"><span className="text-[#667892]">Tổng tiền</span><span className="font-medium">{formatCurrency(actionTarget.invoice.totalAmount)}</span></div>
                        <div className="mt-2 flex justify-between gap-3"><span className="text-[#667892]">Phần đủ điều kiện</span><span className="font-medium">{formatCurrency(toMoneyNumber(adjustInsuranceForm.eligibleAmount))}</span></div>
                        <div className="mt-2 flex justify-between gap-3"><span className="text-[#667892]">Mức hưởng</span><span className="font-medium">{adjustInsuranceForm.coverageRate}%</span></div>
                        <div className="mt-2 flex justify-between gap-3"><span className="text-[#667892]">Giảm BHYT mới</span><span className="font-medium">{formatCurrency(adjustedDiscount)}</span></div>
                        <div className="mt-2 flex justify-between gap-3 border-t border-[#e5ebf3] pt-2"><span className="font-semibold">Cần thu mới</span><span className="font-semibold text-[#0d4f8b]">{formatCurrency(adjustedFinalAmount)}</span></div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button disabled={busy || adjustedDiscount > actionTarget.invoice.totalAmount} onClick={() => void adjustInvoice()} className="rounded-md bg-[#0d4f8b] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Lưu điều chỉnh</button>
                        <button type="button" onClick={() => { setActionTarget(null); setAdjustInsuranceForm(defaultInsuranceForm); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]">Đóng</button>
                      </div>
                    </>
                  ) : null}
                  {actionTarget.type === "refund" ? (
                    <>
                      <h4 className="font-semibold">Xác nhận hoàn tiền</h4>
                      <label className="mt-3 block">
                        <span className="text-sm font-medium text-[#334155]">Lý do hoàn tiền</span>
                        <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={3} placeholder="Ví dụ: bệnh nhân yêu cầu hoàn tiền" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                      </label>
                      <div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => void refundInvoice()} className="rounded-md bg-[#0d4f8b] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Hoàn tiền</button><button type="button" onClick={() => { setActionTarget(null); setRefundReason(""); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]">Hủy</button></div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-[#55708f]">Chi tiết hóa đơn</p>
              <h3 className="mt-1 text-xl font-semibold">Chọn một hóa đơn</h3>
              <p className="mt-2 text-sm leading-6 text-[#667892]">Bấm vào mã hóa đơn để xem barcode, số tiền và thao tác thanh toán.</p>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
