"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { VietnamDateInput } from "@/components/ui/vietnam-date-input";
import { apiRequest, uploadImages } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatVietnamDate, getVietnamDateInput } from "@/lib/date";
import type {
  DoctorProfile,
  LabResult,
  ListResult,
  MedicalRecord,
  MedicalResultStatus,
} from "@/lib/types";

type RecordForm = {
  symptoms: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  doctorNotes: string;
  resultPdfUrl: string;
};

type LabForm = {
  testName: string;
  resultValue: string;
  unit: string;
  referenceRange: string;
  conclusion: string;
  fileUrl: string;
};

const emptyRecordForm: RecordForm = {
  symptoms: "",
  diagnosis: "",
  treatment: "",
  prescription: "",
  doctorNotes: "",
  resultPdfUrl: "",
};

const emptyLabForm: LabForm = {
  testName: "",
  resultValue: "",
  unit: "",
  referenceRange: "",
  conclusion: "",
  fileUrl: "",
};

const statusOptions: { value: "" | MedicalResultStatus; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Bản nháp" },
  { value: "PUBLISHED", label: "Đã công bố" },
  { value: "ARCHIVED", label: "Đã lưu trữ" },
];

const statusLabel: Record<MedicalResultStatus, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã công bố",
  ARCHIVED: "Đã lưu trữ",
};

const statusClass: Record<MedicalResultStatus, string> = {
  DRAFT: "bg-[#fff4d6] text-[#8a5a00]",
  PUBLISHED: "bg-[#e7f6ed] text-[#1f7a3a]",
  ARCHIVED: "bg-[#eef2f7] text-[#667892]",
};

const today = () => getVietnamDateInput();

const formatDate = (value: string) => formatVietnamDate(value);

const doctorName = (doctor: DoctorProfile | MedicalRecord["doctor"]) =>
  [doctor.title, doctor.user.fullName].filter(Boolean).join(" ");

const toRecordForm = (record: MedicalRecord): RecordForm => ({
  symptoms: record.symptoms || "",
  diagnosis: record.diagnosis || "",
  treatment: record.treatment || "",
  prescription: record.prescription || "",
  doctorNotes: record.doctorNotes || "",
  resultPdfUrl: record.resultPdfUrl || "",
});

const toLabForm = (lab: LabResult): LabForm => ({
  testName: lab.testName,
  resultValue: lab.resultValue || "",
  unit: lab.unit || "",
  referenceRange: lab.referenceRange || "",
  conclusion: lab.conclusion || "",
  fileUrl: lab.fileUrl || "",
});

const buildRecordPayload = (form: RecordForm) => ({
  symptoms: form.symptoms.trim() || null,
  diagnosis: form.diagnosis.trim() || null,
  treatment: form.treatment.trim() || null,
  prescription: form.prescription.trim() || null,
  doctorNotes: form.doctorNotes.trim() || null,
  resultPdfUrl: form.resultPdfUrl.trim() || null,
});

const buildLabPayload = (form: LabForm) => ({
  testName: form.testName.trim(),
  resultValue: form.resultValue.trim() || null,
  unit: form.unit.trim() || null,
  referenceRange: form.referenceRange.trim() || null,
  conclusion: form.conclusion.trim() || null,
  fileUrl: form.fileUrl.trim() || null,
});

export default function MedicalRecordsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [status, setStatus] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(today());
  const [recordCode, setRecordCode] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingRecordFile, setUploadingRecordFile] = useState(false);
  const [uploadingLabFile, setUploadingLabFile] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<MedicalRecord | null>(null);
  const [recordForm, setRecordForm] = useState<RecordForm>(emptyRecordForm);
  const [editingLab, setEditingLab] = useState<LabResult | null>(null);
  const [deleteLabTarget, setDeleteLabTarget] = useState<LabResult | null>(null);
  const [labForm, setLabForm] = useState<LabForm>(emptyLabForm);
  const listRef = useRef<HTMLElement | null>(null);
  const detailRef = useRef<HTMLElement | null>(null);

  const canArchive = user?.role === "ADMIN" || user?.role === "STAFF";
  const isDoctor = user?.role === "DOCTOR";
  const canCreatePrescription = user?.role === "ADMIN" || user?.role === "DOCTOR";

  const query = useMemo(
    () => ({
      status: status || undefined,
      doctorId: isDoctor ? undefined : doctorId || undefined,
      date: date || undefined,
      recordCode: recordCode.trim() || undefined,
      page,
      limit: 20,
    }),
    [date, doctorId, isDoctor, page, recordCode, status],
  );

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<ListResult<MedicalRecord>>("/dashboard/medical-records", {
        query,
      });
      setRecords(result.items);
      setPagination(result.pagination);
      setSelected((current) =>
        current ? result.items.find((item) => item.id === current.id) || current : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được hồ sơ khám");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadDoctors = useCallback(async () => {
    if (isDoctor) {
      setDoctors([]);
      return;
    }

    try {
      const result = await apiRequest<ListResult<DoctorProfile>>("/dashboard/doctors", {
        query: { limit: 100 },
      });
      setDoctors(result.items);
    } catch {
      setDoctors([]);
    }
  }, [isDoctor]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRecords();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRecords]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDoctors();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDoctors]);

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

  const setQuickFilter = (nextStatus: "" | MedicalResultStatus, nextDate = today()) => {
    setStatus(nextStatus);
    setDate(nextDate);
    setRecordCode("");
    setPage(1);
    scrollTo(listRef);
  };

  const doctorSummary = useMemo(
    () => ({
      total: records.length,
      draft: records.filter((record) => record.status === "DRAFT").length,
      publishable: records.filter((record) => record.status === "DRAFT" && ["IN_PROGRESS", "COMPLETED"].includes(record.appointment.status)).length,
      published: records.filter((record) => record.status === "PUBLISHED").length,
      needPrescription: records.filter((record) => !record.prescriptionRecord && ["IN_PROGRESS", "COMPLETED"].includes(record.appointment.status)).length,
    }),
    [records],
  );

  const openDetail = (record: MedicalRecord) => {
    setSelected(record);
    setRecordForm(toRecordForm(record));
    setEditingLab(null);
    setDeleteLabTarget(null);
    setLabForm(emptyLabForm);
    scrollTo(detailRef);
  };

  const saveRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<MedicalRecord>(`/dashboard/medical-records/${selected.id}`, {
        method: "PATCH",
        body: buildRecordPayload(recordForm),
      });
      setSelected(updated);
      setRecordForm(toRecordForm(updated));
      setNotice("Đã cập nhật hồ sơ khám");
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được hồ sơ khám");
    } finally {
      setBusy(false);
    }
  };

  const uploadRecordResultFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadingRecordFile(true);
    setError("");
    setNotice("");
    try {
      const [asset] = await uploadImages([file], "medical-results");
      if (!asset) {
        throw new Error("Upload thành công nhưng không nhận được URL file");
      }
      setRecordForm((current) => ({ ...current, resultPdfUrl: asset.url }));
      setNotice("Đã upload file kết quả");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không upload được file kết quả");
    } finally {
      setUploadingRecordFile(false);
    }
  };

  const uploadLabResultFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadingLabFile(true);
    setError("");
    setNotice("");
    try {
      const [asset] = await uploadImages([file], "medical-results");
      if (!asset) {
        throw new Error("Upload thành công nhưng không nhận được URL file");
      }
      setLabForm((current) => ({ ...current, fileUrl: asset.url }));
      setNotice("Đã upload file cận lâm sàng");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không upload được file cận lâm sàng");
    } finally {
      setUploadingLabFile(false);
    }
  };

  const simpleRecordAction = async (record: MedicalRecord, path: string, message: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<MedicalRecord>(`/dashboard/medical-records/${record.id}${path}`, {
        method: "PATCH",
      });
      setSelected(updated);
      setRecordForm(toRecordForm(updated));
      setNotice(message);
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thực hiện được thao tác");
    } finally {
      setBusy(false);
    }
  };

  const createPrescriptionFromRecord = async (record: MedicalRecord) => {
    if (!canCreatePrescription) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/dashboard/medical-records/${record.id}/prescription`, {
        method: "POST",
        body: {
          note: recordForm.prescription.trim() || recordForm.doctorNotes.trim() || null,
          items: [],
        },
      });
      const refreshed = await apiRequest<MedicalRecord>(`/dashboard/medical-records/${record.id}`);
      setSelected(refreshed);
      setRecordForm(toRecordForm(refreshed));
      setNotice("Đã tạo đơn thuốc nháp từ hồ sơ");
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được đơn thuốc từ hồ sơ");
    } finally {
      setBusy(false);
    }
  };

  const saveLabResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (editingLab) {
        await apiRequest<LabResult>(
          `/dashboard/medical-records/${selected.id}/lab-results/${editingLab.id}`,
          { method: "PATCH", body: buildLabPayload(labForm) },
        );
        setNotice("Đã cập nhật kết quả cận lâm sàng");
      } else {
        await apiRequest<LabResult>(`/dashboard/medical-records/${selected.id}/lab-results`, {
          method: "POST",
          body: buildLabPayload(labForm),
        });
        setNotice("Đã thêm kết quả cận lâm sàng");
      }
      setEditingLab(null);
      setDeleteLabTarget(null);
      setLabForm(emptyLabForm);
      const refreshed = await apiRequest<MedicalRecord>(`/dashboard/medical-records/${selected.id}`);
      setSelected(refreshed);
      setRecordForm(toRecordForm(refreshed));
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được kết quả cận lâm sàng");
    } finally {
      setBusy(false);
    }
  };

  const deleteLabResult = async () => {
    if (!selected || !deleteLabTarget) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<LabResult>(`/dashboard/medical-records/${selected.id}/lab-results/${deleteLabTarget.id}`, {
        method: "DELETE",
      });
      setNotice("Đã xoá kết quả cận lâm sàng");
      setDeleteLabTarget(null);
      const refreshed = await apiRequest<MedicalRecord>(`/dashboard/medical-records/${selected.id}`);
      setSelected(refreshed);
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xoá được kết quả cận lâm sàng");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
      {notice || error ? (
        <div className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-md sm:right-6 sm:top-6">
          <div className={`rounded-md border px-4 py-3 shadow-lg ${error ? "border-[#f2b8b5] bg-[#fff3f2] text-[#b3261e]" : "border-[#a8dab5] bg-[#f0fff4] text-[#1f7a3a]"}`}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-sm font-semibold">{error ? "Có lỗi xảy ra" : "Thành công"}</p><p className="mt-1 text-sm">{error || notice}</p></div>
              <button type="button" onClick={() => { setError(""); setNotice(""); }} className="rounded-md px-2 text-lg leading-none opacity-70 hover:bg-black/5 hover:opacity-100" aria-label="Đóng thông báo">x</button>
            </div>
          </div>
        </div>
      ) : null}

      <section ref={listRef} className="min-w-0 scroll-mt-24 space-y-4">
        <div className="rounded-md border border-[#dce3ee] bg-white p-5">
          <p className="text-sm font-medium text-[#55708f]">{isDoctor ? "Khu làm việc bác sĩ" : "Chuyên môn"}</p>
          <h2 className="mt-1 text-2xl font-semibold">Hồ sơ khám</h2>
          <p className="mt-2 text-sm text-[#667892]">
            {isDoctor ? "Ưu tiên hoàn thiện hồ sơ trong ca khám, thêm kết quả cận lâm sàng, kê đơn và công bố kết quả." : "Cập nhật chẩn đoán, điều trị, kết quả cận lâm sàng và công bố kết quả khám."}
          </p>
        </div>

        {isDoctor ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button type="button" onClick={() => setQuickFilter("", today())} className="rounded-md border border-[#cfe4fa] bg-[#f3f8ff] p-4 text-left text-[#0d4f8b] transition hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-sm font-medium opacity-80">Hồ sơ đang lọc</p>
              <p className="mt-2 text-2xl font-semibold">{doctorSummary.total}</p>
              <p className="mt-1 text-xs opacity-75">Toàn bộ hồ sơ trong ngày</p>
            </button>
            <button type="button" onClick={() => setQuickFilter("DRAFT", today())} className="rounded-md border border-[#f4d7a1] bg-[#fff8eb] p-4 text-left text-[#946200] transition hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-sm font-medium opacity-80">Hồ sơ nháp</p>
              <p className="mt-2 text-2xl font-semibold">{doctorSummary.draft}</p>
              <p className="mt-1 text-xs opacity-75">Cần nhập hoặc kiểm tra</p>
            </button>
            <button type="button" onClick={() => setQuickFilter("DRAFT", today())} className="rounded-md border border-[#e2d6ff] bg-[#f7f2ff] p-4 text-left text-[#673ab7] transition hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-sm font-medium opacity-80">Có thể công bố</p>
              <p className="mt-2 text-2xl font-semibold">{doctorSummary.publishable}</p>
              <p className="mt-1 text-xs opacity-75">Ca đã bắt đầu hoặc hoàn tất</p>
            </button>
            <button type="button" onClick={() => setQuickFilter("PUBLISHED", today())} className="rounded-md border border-[#c7ead0] bg-[#f0fff4] p-4 text-left text-[#1f7a3a] transition hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-sm font-medium opacity-80">Đã công bố</p>
              <p className="mt-2 text-2xl font-semibold">{doctorSummary.published}</p>
              <p className="mt-1 text-xs opacity-75">{doctorSummary.needPrescription} hồ sơ chưa có đơn</p>
            </button>
          </div>
        ) : null}

        <div className="rounded-md border border-[#dce3ee] bg-white">
          <div className={`grid gap-3 border-b border-[#e5ebf3] p-4 ${isDoctor ? "lg:grid-cols-[170px_170px_1fr]" : "lg:grid-cols-[170px_1fr_170px_170px]"}`}>
            <VietnamDateInput value={date} onChange={(value) => { setDate(value); setPage(1); }} ariaLabel="Ngày lọc hồ sơ khám" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
            {!isDoctor ? (
              <select value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
                <option value="">Tất cả bác sĩ</option>
                {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctorName(doctor)}</option>)}
              </select>
            ) : null}
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <input value={recordCode} onChange={(e) => { setRecordCode(e.target.value); setPage(1); }} placeholder="Mã hồ sơ" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#667892]">
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Hồ sơ</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Bệnh nhân</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Lịch hẹn</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Bác sĩ</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Kết quả</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Đang tải hồ sơ...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Chưa có hồ sơ phù hợp</td></tr>
                ) : records.map((record) => (
                  <tr key={record.id} className="align-top">
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <button onClick={() => openDetail(record)} className="font-semibold text-[#0d4f8b] hover:underline">{record.recordCode}</button>
                      <p className="mt-1 text-xs text-[#667892]">{record.labResults.length} kết quả CLS</p>
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><p className="font-semibold">{record.patient.fullName}</p><p className="mt-1 text-xs text-[#667892]">{record.patient.phone}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><p>{record.appointment.bookingCode}</p><p className="mt-1 text-xs text-[#667892]">{formatDate(record.appointment.appointmentDate)} {record.appointment.startTime}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><p>{doctorName(record.doctor)}</p><p className="mt-1 text-xs text-[#667892]">{record.doctor.department.name}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClass[record.status]}`}>{statusLabel[record.status]}</span><p className="mt-1 text-xs text-[#667892]">{record.diagnosis || "Chưa có chẩn đoán"}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3 text-right"><button onClick={() => openDetail(record)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Chi tiết</button></td>
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

      <aside ref={detailRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5 xl:sticky xl:top-24 xl:self-start">
        {selected ? (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-[#55708f]">Chi tiết hồ sơ</p>
              <h3 className="mt-1 text-xl font-semibold">{selected.recordCode}</h3>
              <span className={`mt-3 inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusClass[selected.status]}`}>{statusLabel[selected.status]}</span>
            </div>

            <div className="rounded-md border border-[#e5ebf3] p-3 text-sm">
              <p className="font-semibold">{selected.patient.fullName}</p>
              <p className="text-[#667892]">{selected.patient.phone || "-"} · {selected.appointment.bookingCode}</p>
              <p className="mt-1 text-[#667892]">{doctorName(selected.doctor)} · {selected.doctor.department.name}</p>
            </div>

            <form className="space-y-3" onSubmit={saveRecord}>
              {[
                ["symptoms", "Triệu chứng"],
                ["diagnosis", "Chẩn đoán"],
                ["treatment", "Hướng điều trị"],
                ["prescription", "Đơn thuốc ghi chú"],
                ["doctorNotes", "Ghi chú bác sĩ"],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-sm font-medium text-[#334155]">{label}</span>
                  <textarea value={recordForm[key as keyof RecordForm]} onChange={(e) => setRecordForm((current) => ({ ...current, [key]: e.target.value }))} rows={2} className="mt-1 w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                </label>
              ))}
              <label className="block">
                <span className="text-sm font-medium text-[#334155]">URL file kết quả</span>
                <input value={recordForm.resultPdfUrl} onChange={(e) => setRecordForm((current) => ({ ...current, resultPdfUrl: e.target.value }))} placeholder="https://..." className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingRecordFile}
                  onChange={(event) => void uploadRecordResultFile(event.target.files?.[0])}
                  className="mt-2 w-full rounded-md border border-dashed border-[#cfd8e6] bg-[#f8fafc] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0d4f8b] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-[#667892]">
                  Upload hiện hỗ trợ JPG, PNG, WEBP qua folder medical-results.
                </p>
                {recordForm.resultPdfUrl ? (
                  <div className="mt-2 rounded-md border border-[#e5ebf3] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={recordForm.resultPdfUrl}
                      alt="Preview file kết quả"
                      className="h-36 w-full rounded-md object-cover"
                    />
                    <p className="mt-2 truncate text-xs text-[#667892]">{recordForm.resultPdfUrl}</p>
                  </div>
                ) : null}
              </label>
              <div className="flex flex-wrap gap-2">
                <button disabled={busy || uploadingRecordFile} className="rounded-md bg-[#0d4f8b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{uploadingRecordFile ? "Đang upload..." : "Lưu hồ sơ"}</button>
                {selected.status !== "PUBLISHED" ? <button type="button" disabled={busy} onClick={() => void simpleRecordAction(selected, "/publish", "Đã công bố kết quả")} className="rounded-md border border-[#cfd8e6] px-4 py-2 text-sm font-medium text-[#42526b]">Công bố</button> : null}
                {canCreatePrescription && !selected.prescriptionRecord ? <button type="button" disabled={busy} onClick={() => void createPrescriptionFromRecord(selected)} className="rounded-md border border-[#cfe4fa] px-4 py-2 text-sm font-medium text-[#0d4f8b]">Tạo đơn thuốc</button> : null}
                {selected.prescriptionRecord ? <Link href="/dashboard/prescriptions" className="rounded-md border border-[#cfe4fa] px-4 py-2 text-sm font-medium text-[#0d4f8b]">Mở đơn thuốc</Link> : null}
                {canArchive && selected.status !== "ARCHIVED" ? <button type="button" disabled={busy} onClick={() => void simpleRecordAction(selected, "/archive", "Đã lưu trữ hồ sơ")} className="rounded-md border border-[#cfd8e6] px-4 py-2 text-sm font-medium text-[#42526b]">Lưu trữ</button> : null}
              </div>
            </form>

            <section className="border-t border-[#e5ebf3] pt-5">
              <h4 className="font-semibold">Kết quả cận lâm sàng</h4>
              <div className="mt-3 space-y-2">
                {selected.labResults.length === 0 ? <p className="text-sm text-[#667892]">Chưa có kết quả CLS</p> : selected.labResults.map((lab) => (
                  <div key={lab.id} className="rounded-md border border-[#e5ebf3] p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{lab.testName}</p>
                        <p className="text-[#667892]">{lab.resultValue || "-"} {lab.unit || ""}</p>
                        <p className="text-xs text-[#667892]">Mốc: {lab.referenceRange || "-"}</p>
                        <p className="mt-1">{lab.conclusion || ""}</p>
                        {lab.fileUrl ? <a href={lab.fileUrl} target="_blank" className="text-xs font-medium text-[#0d4f8b]">Mở file</a> : null}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setEditingLab(lab); setDeleteLabTarget(null); setLabForm(toLabForm(lab)); }} className="rounded-md border border-[#cfd8e6] px-2 py-1 text-xs text-[#42526b]">Sửa</button>
                        <button type="button" onClick={() => { setDeleteLabTarget(lab); setEditingLab(null); }} className="rounded-md border border-[#f2b8b5] px-2 py-1 text-xs text-[#b3261e]">Xoá</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {deleteLabTarget ? (
                <div className="mt-3 rounded-md border border-[#f2d4d2] bg-[#fff8f7] p-3 text-sm">
                  <p className="font-semibold text-[#8f1d18]">Xoá kết quả cận lâm sàng?</p>
                  <p className="mt-1 text-[#667892]">{deleteLabTarget.testName}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => setDeleteLabTarget(null)} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]">Giữ lại</button>
                    <button type="button" disabled={busy} onClick={() => void deleteLabResult()} className="rounded-md bg-[#b3261e] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Xoá kết quả</button>
                  </div>
                </div>
              ) : null}

              <form className="mt-4 space-y-3 rounded-md border border-[#e5ebf3] p-3" onSubmit={saveLabResult}>
                <h5 className="font-semibold">{editingLab ? "Sửa kết quả CLS" : "Thêm kết quả CLS"}</h5>
                <input value={labForm.testName} onChange={(e) => setLabForm((current) => ({ ...current, testName: e.target.value }))} placeholder="Tên xét nghiệm" className="w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={labForm.resultValue} onChange={(e) => setLabForm((current) => ({ ...current, resultValue: e.target.value }))} placeholder="Giá trị" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                  <input value={labForm.unit} onChange={(e) => setLabForm((current) => ({ ...current, unit: e.target.value }))} placeholder="Đơn vị" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                </div>
                <input value={labForm.referenceRange} onChange={(e) => setLabForm((current) => ({ ...current, referenceRange: e.target.value }))} placeholder="Khoảng tham chiếu" className="w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                <textarea value={labForm.conclusion} onChange={(e) => setLabForm((current) => ({ ...current, conclusion: e.target.value }))} placeholder="Kết luận" rows={2} className="w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                <div>
                  <input value={labForm.fileUrl} onChange={(e) => setLabForm((current) => ({ ...current, fileUrl: e.target.value }))} placeholder="URL file kết quả" className="w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingLabFile}
                    onChange={(event) => void uploadLabResultFile(event.target.files?.[0])}
                    className="mt-2 w-full rounded-md border border-dashed border-[#cfd8e6] bg-[#f8fafc] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0d4f8b] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:opacity-60"
                  />
                  <p className="mt-1 text-xs text-[#667892]">
                    Upload hiện hỗ trợ JPG, PNG, WEBP qua folder medical-results.
                  </p>
                  {labForm.fileUrl ? (
                    <div className="mt-2 rounded-md border border-[#e5ebf3] p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={labForm.fileUrl}
                        alt="Preview file cận lâm sàng"
                        className="h-32 w-full rounded-md object-cover"
                      />
                      <p className="mt-2 truncate text-xs text-[#667892]">{labForm.fileUrl}</p>
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button disabled={busy || uploadingLabFile} className="flex-1 rounded-md bg-[#0d4f8b] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{uploadingLabFile ? "Đang upload..." : busy ? "Đang lưu..." : editingLab ? "Lưu CLS" : "Thêm CLS"}</button>
                  {editingLab ? <button type="button" onClick={() => { setEditingLab(null); setLabForm(emptyLabForm); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]">Huỷ</button> : null}
                </div>
              </form>
            </section>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-[#55708f]">Chi tiết hồ sơ</p>
            <h3 className="mt-1 text-xl font-semibold">Chọn một hồ sơ</h3>
            <p className="mt-2 text-sm leading-6 text-[#667892]">Bấm vào mã hồ sơ để cập nhật chẩn đoán, điều trị và kết quả cận lâm sàng.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
