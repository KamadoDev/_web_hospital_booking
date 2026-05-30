"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, uploadImages } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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
  { value: "", label: "Tat ca trang thai" },
  { value: "DRAFT", label: "Ban nhap" },
  { value: "PUBLISHED", label: "Da cong bo" },
  { value: "ARCHIVED", label: "Da luu tru" },
];

const statusLabel: Record<MedicalResultStatus, string> = {
  DRAFT: "Ban nhap",
  PUBLISHED: "Da cong bo",
  ARCHIVED: "Da luu tru",
};

const statusClass: Record<MedicalResultStatus, string> = {
  DRAFT: "bg-[#fff4d6] text-[#8a5a00]",
  PUBLISHED: "bg-[#e7f6ed] text-[#1f7a3a]",
  ARCHIVED: "bg-[#eef2f7] text-[#667892]",
};

const today = () => new Date().toISOString().slice(0, 10);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN").format(new Date(value));

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
  const [labForm, setLabForm] = useState<LabForm>(emptyLabForm);
  const listRef = useRef<HTMLElement | null>(null);
  const detailRef = useRef<HTMLElement | null>(null);

  const canArchive = user?.role === "ADMIN" || user?.role === "STAFF";

  const query = useMemo(
    () => ({
      status: status || undefined,
      doctorId: doctorId || undefined,
      date: date || undefined,
      recordCode: recordCode.trim() || undefined,
      page,
      limit: 20,
    }),
    [date, doctorId, page, recordCode, status],
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
      setError(err instanceof Error ? err.message : "Khong tai duoc ho so kham");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadDoctors = useCallback(async () => {
    try {
      const result = await apiRequest<ListResult<DoctorProfile>>("/dashboard/doctors", {
        query: { limit: 100 },
      });
      setDoctors(result.items);
    } catch {
      setDoctors([]);
    }
  }, []);

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

  const openDetail = (record: MedicalRecord) => {
    setSelected(record);
    setRecordForm(toRecordForm(record));
    setEditingLab(null);
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
      setNotice("Da cap nhat ho so kham");
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong cap nhat duoc ho so kham");
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
        throw new Error("Upload thanh cong nhung khong nhan duoc URL file");
      }
      setRecordForm((current) => ({ ...current, resultPdfUrl: asset.url }));
      setNotice("Da upload file ket qua");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong upload duoc file ket qua");
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
        throw new Error("Upload thanh cong nhung khong nhan duoc URL file");
      }
      setLabForm((current) => ({ ...current, fileUrl: asset.url }));
      setNotice("Da upload file can lam sang");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong upload duoc file can lam sang");
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
      setError(err instanceof Error ? err.message : "Khong thuc hien duoc thao tac");
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
        setNotice("Da cap nhat ket qua can lam sang");
      } else {
        await apiRequest<LabResult>(`/dashboard/medical-records/${selected.id}/lab-results`, {
          method: "POST",
          body: buildLabPayload(labForm),
        });
        setNotice("Da them ket qua can lam sang");
      }
      setEditingLab(null);
      setLabForm(emptyLabForm);
      const refreshed = await apiRequest<MedicalRecord>(`/dashboard/medical-records/${selected.id}`);
      setSelected(refreshed);
      setRecordForm(toRecordForm(refreshed));
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong luu duoc ket qua can lam sang");
    } finally {
      setBusy(false);
    }
  };

  const deleteLabResult = async (lab: LabResult) => {
    if (!selected || !window.confirm(`Xoa ket qua "${lab.testName}"?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<LabResult>(`/dashboard/medical-records/${selected.id}/lab-results/${lab.id}`, {
        method: "DELETE",
      });
      setNotice("Da xoa ket qua can lam sang");
      const refreshed = await apiRequest<MedicalRecord>(`/dashboard/medical-records/${selected.id}`);
      setSelected(refreshed);
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong xoa duoc ket qua can lam sang");
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
              <div><p className="text-sm font-semibold">{error ? "Co loi xay ra" : "Thanh cong"}</p><p className="mt-1 text-sm">{error || notice}</p></div>
              <button type="button" onClick={() => { setError(""); setNotice(""); }} className="rounded-md px-2 text-lg leading-none opacity-70 hover:bg-black/5 hover:opacity-100" aria-label="Dong thong bao">x</button>
            </div>
          </div>
        </div>
      ) : null}

      <section ref={listRef} className="min-w-0 scroll-mt-24 space-y-4">
        <div className="rounded-md border border-[#dce3ee] bg-white p-5">
          <p className="text-sm font-medium text-[#55708f]">Chuyen mon</p>
          <h2 className="mt-1 text-2xl font-semibold">Ho so kham</h2>
          <p className="mt-2 text-sm text-[#667892]">Cap nhat chan doan, dieu tri, ket qua can lam sang va publish ket qua kham.</p>
        </div>

        <div className="rounded-md border border-[#dce3ee] bg-white">
          <div className="grid gap-3 border-b border-[#e5ebf3] p-4 lg:grid-cols-[170px_1fr_170px_170px]">
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
            <select value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              <option value="">Tat ca bac si</option>
              {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctorName(doctor)}</option>)}
            </select>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <input value={recordCode} onChange={(e) => { setRecordCode(e.target.value); setPage(1); }} placeholder="Ma ho so" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#667892]">
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Ho so</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Benh nhan</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Lich hen</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Bac si</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Ket qua</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 text-right font-semibold">Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Dang tai ho so...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#667892]">Chua co ho so phu hop</td></tr>
                ) : records.map((record) => (
                  <tr key={record.id} className="align-top">
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <button onClick={() => openDetail(record)} className="font-semibold text-[#0d4f8b] hover:underline">{record.recordCode}</button>
                      <p className="mt-1 text-xs text-[#667892]">{record.labResults.length} ket qua CLS</p>
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><p className="font-semibold">{record.patient.fullName}</p><p className="mt-1 text-xs text-[#667892]">{record.patient.phone}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><p>{record.appointment.bookingCode}</p><p className="mt-1 text-xs text-[#667892]">{formatDate(record.appointment.appointmentDate)} {record.appointment.startTime}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><p>{doctorName(record.doctor)}</p><p className="mt-1 text-xs text-[#667892]">{record.doctor.department.name}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClass[record.status]}`}>{statusLabel[record.status]}</span><p className="mt-1 text-xs text-[#667892]">{record.diagnosis || "Chua co chan doan"}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3 text-right"><button onClick={() => openDetail(record)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Chi tiet</button></td>
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

      <aside ref={detailRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5 xl:sticky xl:top-24 xl:self-start">
        {selected ? (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-[#55708f]">Chi tiet ho so</p>
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
                ["symptoms", "Trieu chung"],
                ["diagnosis", "Chan doan"],
                ["treatment", "Huong dieu tri"],
                ["prescription", "Don thuoc ghi chu"],
                ["doctorNotes", "Ghi chu bac si"],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-sm font-medium text-[#334155]">{label}</span>
                  <textarea value={recordForm[key as keyof RecordForm]} onChange={(e) => setRecordForm((current) => ({ ...current, [key]: e.target.value }))} rows={2} className="mt-1 w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                </label>
              ))}
              <label className="block">
                <span className="text-sm font-medium text-[#334155]">URL file ket qua PDF</span>
                <input value={recordForm.resultPdfUrl} onChange={(e) => setRecordForm((current) => ({ ...current, resultPdfUrl: e.target.value }))} placeholder="https://..." className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingRecordFile}
                  onChange={(event) => void uploadRecordResultFile(event.target.files?.[0])}
                  className="mt-2 w-full rounded-md border border-dashed border-[#cfd8e6] bg-[#f8fafc] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0d4f8b] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-[#667892]">
                  Upload hien ho tro JPG, PNG, WEBP qua folder medical-results.
                </p>
                {recordForm.resultPdfUrl ? (
                  <div className="mt-2 rounded-md border border-[#e5ebf3] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={recordForm.resultPdfUrl}
                      alt="Preview file ket qua"
                      className="h-36 w-full rounded-md object-cover"
                    />
                    <p className="mt-2 truncate text-xs text-[#667892]">{recordForm.resultPdfUrl}</p>
                  </div>
                ) : null}
              </label>
              <div className="flex flex-wrap gap-2">
                <button disabled={busy || uploadingRecordFile} className="rounded-md bg-[#0d4f8b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{uploadingRecordFile ? "Dang upload..." : "Luu ho so"}</button>
                {selected.status !== "PUBLISHED" ? <button type="button" disabled={busy} onClick={() => void simpleRecordAction(selected, "/publish", "Da publish ket qua")} className="rounded-md border border-[#cfd8e6] px-4 py-2 text-sm font-medium text-[#42526b]">Publish</button> : null}
                {canArchive && selected.status !== "ARCHIVED" ? <button type="button" disabled={busy} onClick={() => void simpleRecordAction(selected, "/archive", "Da luu tru ho so")} className="rounded-md border border-[#cfd8e6] px-4 py-2 text-sm font-medium text-[#42526b]">Archive</button> : null}
              </div>
            </form>

            <section className="border-t border-[#e5ebf3] pt-5">
              <h4 className="font-semibold">Ket qua can lam sang</h4>
              <div className="mt-3 space-y-2">
                {selected.labResults.length === 0 ? <p className="text-sm text-[#667892]">Chua co ket qua CLS</p> : selected.labResults.map((lab) => (
                  <div key={lab.id} className="rounded-md border border-[#e5ebf3] p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{lab.testName}</p>
                        <p className="text-[#667892]">{lab.resultValue || "-"} {lab.unit || ""}</p>
                        <p className="text-xs text-[#667892]">Moc: {lab.referenceRange || "-"}</p>
                        <p className="mt-1">{lab.conclusion || ""}</p>
                        {lab.fileUrl ? <a href={lab.fileUrl} target="_blank" className="text-xs font-medium text-[#0d4f8b]">Mo file</a> : null}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setEditingLab(lab); setLabForm(toLabForm(lab)); }} className="rounded-md border border-[#cfd8e6] px-2 py-1 text-xs text-[#42526b]">Sua</button>
                        <button type="button" onClick={() => void deleteLabResult(lab)} className="rounded-md border border-[#f2b8b5] px-2 py-1 text-xs text-[#b3261e]">Xoa</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form className="mt-4 space-y-3 rounded-md border border-[#e5ebf3] p-3" onSubmit={saveLabResult}>
                <h5 className="font-semibold">{editingLab ? "Sua ket qua CLS" : "Them ket qua CLS"}</h5>
                <input value={labForm.testName} onChange={(e) => setLabForm((current) => ({ ...current, testName: e.target.value }))} placeholder="Ten xet nghiem" className="w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={labForm.resultValue} onChange={(e) => setLabForm((current) => ({ ...current, resultValue: e.target.value }))} placeholder="Gia tri" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                  <input value={labForm.unit} onChange={(e) => setLabForm((current) => ({ ...current, unit: e.target.value }))} placeholder="Don vi" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                </div>
                <input value={labForm.referenceRange} onChange={(e) => setLabForm((current) => ({ ...current, referenceRange: e.target.value }))} placeholder="Khoang tham chieu" className="w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                <textarea value={labForm.conclusion} onChange={(e) => setLabForm((current) => ({ ...current, conclusion: e.target.value }))} placeholder="Ket luan" rows={2} className="w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                <div>
                  <input value={labForm.fileUrl} onChange={(e) => setLabForm((current) => ({ ...current, fileUrl: e.target.value }))} placeholder="URL file ket qua" className="w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingLabFile}
                    onChange={(event) => void uploadLabResultFile(event.target.files?.[0])}
                    className="mt-2 w-full rounded-md border border-dashed border-[#cfd8e6] bg-[#f8fafc] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0d4f8b] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:opacity-60"
                  />
                  <p className="mt-1 text-xs text-[#667892]">
                    Upload hien ho tro JPG, PNG, WEBP qua folder medical-results.
                  </p>
                  {labForm.fileUrl ? (
                    <div className="mt-2 rounded-md border border-[#e5ebf3] p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={labForm.fileUrl}
                        alt="Preview file can lam sang"
                        className="h-32 w-full rounded-md object-cover"
                      />
                      <p className="mt-2 truncate text-xs text-[#667892]">{labForm.fileUrl}</p>
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button disabled={busy || uploadingLabFile} className="flex-1 rounded-md bg-[#0d4f8b] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{uploadingLabFile ? "Dang upload..." : busy ? "Dang luu..." : editingLab ? "Luu CLS" : "Them CLS"}</button>
                  {editingLab ? <button type="button" onClick={() => { setEditingLab(null); setLabForm(emptyLabForm); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]">Huy</button> : null}
                </div>
              </form>
            </section>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-[#55708f]">Chi tiet ho so</p>
            <h3 className="mt-1 text-xl font-semibold">Chon mot ho so</h3>
            <p className="mt-2 text-sm leading-6 text-[#667892]">Bam vao ma ho so de cap nhat chan doan, dieu tri va ket qua can lam sang.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
