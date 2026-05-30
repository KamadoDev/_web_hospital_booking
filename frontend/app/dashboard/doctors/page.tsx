"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { DashboardUser, Department, DoctorProfile, ListResult } from "@/lib/types";

type DoctorForm = {
  userId: string;
  departmentId: string;
  title: string;
  specialization: string;
  experience: string;
  consultationFee: string;
  bio: string;
  isAvailable: boolean;
};

const emptyForm: DoctorForm = {
  userId: "",
  departmentId: "",
  title: "",
  specialization: "",
  experience: "",
  consultationFee: "0",
  bio: "",
  isAvailable: true,
};

const availabilityOptions = [
  { label: "Tat ca", value: "" },
  { label: "San sang kham", value: "true" },
  { label: "Tam ngung", value: "false" },
];

const toForm = (doctor: DoctorProfile): DoctorForm => ({
  userId: doctor.user.id,
  departmentId: doctor.department.id,
  title: doctor.title || "",
  specialization: doctor.specialization || "",
  experience: doctor.experience === null ? "" : String(doctor.experience),
  consultationFee: String(doctor.consultationFee || 0),
  bio: doctor.bio || "",
  isAvailable: doctor.isAvailable,
});

const buildCreatePayload = (form: DoctorForm) => ({
  userId: form.userId,
  departmentId: form.departmentId,
  title: form.title.trim() || null,
  specialization: form.specialization.trim() || null,
  experience: form.experience === "" ? undefined : Number(form.experience),
  consultationFee: form.consultationFee === "" ? undefined : Number(form.consultationFee),
  bio: form.bio.trim() || null,
  isAvailable: form.isAvailable,
});

const buildUpdatePayload = (form: DoctorForm) => ({
  departmentId: form.departmentId,
  title: form.title.trim() || null,
  specialization: form.specialization.trim() || null,
  experience: form.experience === "" ? null : Number(form.experience),
  consultationFee: form.consultationFee === "" ? 0 : Number(form.consultationFee),
  bio: form.bio.trim() || null,
  isAvailable: form.isAvailable,
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatMoneyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  return new Intl.NumberFormat("vi-VN").format(Number(digits));
};

const parseMoneyInput = (value: string) => value.replace(/\D/g, "");

export default function DoctorsPage() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctorUsers, setDoctorUsers] = useState<DashboardUser[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [isAvailable, setIsAvailable] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<DoctorProfile | null>(null);
  const [form, setForm] = useState<DoctorForm>(emptyForm);
  const listPanelRef = useRef<HTMLElement | null>(null);
  const formPanelRef = useRef<HTMLElement | null>(null);

  const canWrite = user?.role === "ADMIN" || user?.role === "STAFF";
  const canDelete = user?.role === "ADMIN";

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      departmentId: departmentId || undefined,
      isAvailable: isAvailable || undefined,
      page,
      limit: 10,
    }),
    [departmentId, isAvailable, page, search],
  );

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest<ListResult<DoctorProfile>>("/dashboard/doctors", {
        query,
      });
      setDoctors(result.items);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc danh sach bac si");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadDependencies = useCallback(async () => {
    try {
      const departmentResult = await apiRequest<ListResult<Department>>("/dashboard/departments", {
        query: { isActive: true, limit: 100 },
      });
      setDepartments(departmentResult.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc danh sach chuyen khoa");
    }

    if (user?.role === "ADMIN") {
      try {
        const userResult = await apiRequest<ListResult<DashboardUser>>("/dashboard/users", {
          query: { role: "DOCTOR", isActive: true, limit: 100 },
        });
        setDoctorUsers(userResult.items);
      } catch {
        setDoctorUsers([]);
      }
    }
  }, [user?.role]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDoctors();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDoctors]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDependencies();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDependencies]);

  useEffect(() => {
    if (!notice && !error) return;

    const timeoutId = window.setTimeout(() => {
      setNotice("");
      setError("");
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [error, notice]);

  const scrollToForm = () => {
    window.setTimeout(() => {
      formPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const scrollToList = () => {
    window.setTimeout(() => {
      listPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setNotice("");
    setError("");
    scrollToForm();
  };

  const startEdit = (doctor: DoctorProfile) => {
    setEditing(doctor);
    setForm(toForm(doctor));
    setNotice("");
    setError("");
    scrollToForm();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (editing) {
        await apiRequest<DoctorProfile>(`/dashboard/doctors/${editing.id}`, {
          method: "PATCH",
          body: buildUpdatePayload(form),
        });
        setNotice("Da cap nhat ho so bac si");
      } else {
        await apiRequest<DoctorProfile>("/dashboard/doctors", {
          method: "POST",
          body: buildCreatePayload(form),
        });
        setNotice("Da tao ho so bac si");
      }

      setEditing(null);
      setForm(emptyForm);
      await loadDoctors();
      scrollToList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong luu duoc ho so bac si");
    } finally {
      setSaving(false);
    }
  };

  const handleAvailability = async (doctor: DoctorProfile) => {
    if (!canWrite) return;

    setError("");
    setNotice("");

    try {
      await apiRequest<DoctorProfile>(`/dashboard/doctors/${doctor.id}/availability`, {
        method: "PATCH",
        body: { isAvailable: !doctor.isAvailable },
      });
      setNotice("Da cap nhat trang thai bac si");
      await loadDoctors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong cap nhat duoc trang thai");
    }
  };

  const handleDelete = async (doctor: DoctorProfile) => {
    if (!canDelete) return;

    const confirmed = window.confirm(`Xoa ho so bac si "${doctor.user.fullName}"?`);
    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest<DoctorProfile>(`/dashboard/doctors/${doctor.id}`, {
        method: "DELETE",
      });
      setNotice("Da xoa ho so bac si");
      await loadDoctors();
      scrollToList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong xoa duoc ho so bac si");
    }
  };

  const doctorUserOptions = doctorUsers.filter((doctorUser) => {
    if (!editing) {
      return !doctors.some((doctor) => doctor.user.id === doctorUser.id);
    }

    return doctorUser.id === editing.user.id || !doctors.some((doctor) => doctor.user.id === doctorUser.id);
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      {notice || error ? (
        <div className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-md sm:right-6 sm:top-6">
          <div
            className={`rounded-md border px-4 py-3 shadow-lg ${
              error
                ? "border-[#f2b8b5] bg-[#fff3f2] text-[#b3261e]"
                : "border-[#a8dab5] bg-[#f0fff4] text-[#1f7a3a]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{error ? "Co loi xay ra" : "Thanh cong"}</p>
                <p className="mt-1 text-sm">{error || notice}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setNotice("");
                }}
                className="rounded-md px-2 text-lg leading-none opacity-70 hover:bg-black/5 hover:opacity-100"
                aria-label="Dong thong bao"
              >
                x
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section ref={listPanelRef} className="min-w-0 scroll-mt-24 space-y-4">
        <div className="flex flex-col gap-3 rounded-md border border-[#dce3ee] bg-white p-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#55708f]">Du lieu nen</p>
            <h2 className="mt-1 text-2xl font-semibold">Bac si</h2>
            <p className="mt-2 text-sm text-[#667892]">
              Quan ly ho so bac si, chuyen khoa phu trach, phi kham va trang thai san sang nhan lich.
            </p>
          </div>
          {canWrite ? (
            <button
              onClick={startCreate}
              className="rounded-md bg-[#0d4f8b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083d6d]"
            >
              Tao ho so
            </button>
          ) : null}
        </div>

        <div className="rounded-md border border-[#dce3ee] bg-white">
          <div className="grid gap-3 border-b border-[#e5ebf3] p-4 lg:grid-cols-[1fr_220px_170px]">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Tim theo ten, SĐT, hoc ham, chuyen mon"
              className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
            />
            <select
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value);
                setPage(1);
              }}
              className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
            >
              <option value="">Tat ca chuyen khoa</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <select
              value={isAvailable}
              onChange={(event) => {
                setIsAvailable(event.target.value);
                setPage(1);
              }}
              className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
            >
              {availabilityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#667892]">
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Bac si</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Chuyen khoa</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Chuyen mon</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Phi kham</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Lich</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Trang thai</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 text-right font-semibold">
                    Thao tac
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[#667892]">
                      Dang tai danh sach...
                    </td>
                  </tr>
                ) : doctors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[#667892]">
                      Chua co ho so bac si phu hop
                    </td>
                  </tr>
                ) : (
                  doctors.map((doctor) => (
                    <tr key={doctor.id} className="align-top">
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <div className="flex items-center gap-3">
                          {doctor.user.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={doctor.user.avatar}
                              alt={doctor.user.fullName}
                              className="h-10 w-10 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e7f0fb] text-sm font-semibold text-[#0d4f8b]">
                              {doctor.user.fullName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-[#172033]">
                              {[doctor.title, doctor.user.fullName].filter(Boolean).join(" ")}
                            </p>
                            <p className="mt-1 text-xs text-[#667892]">
                              {doctor.user.phone || doctor.user.email || "Chua co lien he"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">{doctor.department.name}</td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <p>{doctor.specialization || "-"}</p>
                        <p className="mt-1 text-xs text-[#667892]">
                          {doctor.experience ?? 0} nam kinh nghiem
                        </p>
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        {formatCurrency(doctor.consultationFee)}
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3 text-[#42526b]">
                        {doctor._count.schedules} lich / {doctor._count.timeSlots} slot
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                            doctor.isAvailable
                              ? "bg-[#e7f6ed] text-[#1f7a3a]"
                              : "bg-[#eef2f7] text-[#667892]"
                          }`}
                        >
                          {doctor.isAvailable ? "San sang" : "Tam ngung"}
                        </span>
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canWrite ? (
                            <>
                              <button
                                onClick={() => startEdit(doctor)}
                                className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b] hover:bg-[#f6f8fb]"
                              >
                                Sua
                              </button>
                              <button
                                onClick={() => void handleAvailability(doctor)}
                                className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b] hover:bg-[#f6f8fb]"
                              >
                                {doctor.isAvailable ? "Tam ngung" : "Mo lai"}
                              </button>
                            </>
                          ) : null}
                          {canDelete ? (
                            <button
                              onClick={() => void handleDelete(doctor)}
                              className="rounded-md border border-[#f2b8b5] px-3 py-1.5 text-xs font-medium text-[#b3261e] hover:bg-[#fff3f2]"
                            >
                              Xoa
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#e5ebf3] px-4 py-3 text-sm text-[#667892]">
            <span>
              {pagination.total} ket qua, trang {pagination.page}/{pagination.totalPages || 1}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50"
              >
                Truoc
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside
        ref={formPanelRef}
        className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5 xl:sticky xl:top-24 xl:self-start"
      >
        <h3 className="text-lg font-semibold">
          {editing ? "Cap nhat ho so bac si" : "Tao ho so bac si"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#667892]">
          {editing
            ? "Tai khoan bac si da gan voi ho so nen khong doi userId tai day."
            : "Chon tai khoan role DOCTOR da co trong nhom nhan su, sau do gan chuyen khoa va thong tin chuyen mon."}
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-[#334155]">Tai khoan bac si</span>
            {editing ? (
              <input
                value={`${editing.user.fullName} (${editing.user.phone || editing.user.email || editing.user.id})`}
                disabled
                className="mt-1 w-full rounded-md border border-[#cfd8e6] bg-[#f6f8fb] px-3 py-2 text-sm text-[#667892]"
              />
            ) : user?.role === "ADMIN" ? (
              <select
                value={form.userId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, userId: event.target.value }))
                }
                disabled={!canWrite}
                className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
                required
              >
                <option value="">Chon tai khoan DOCTOR</option>
                {doctorUserOptions.map((doctorUser) => (
                  <option key={doctorUser.id} value={doctorUser.id}>
                    {doctorUser.fullName} - {doctorUser.phone || doctorUser.email || doctorUser.id}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={form.userId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, userId: event.target.value }))
                }
                disabled={!canWrite}
                placeholder="Nhap userId role DOCTOR"
                className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
                required
              />
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#334155]">Chuyen khoa</span>
            <select
              value={form.departmentId}
              onChange={(event) =>
                setForm((current) => ({ ...current, departmentId: event.target.value }))
              }
              disabled={!canWrite}
              className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
              required
            >
              <option value="">Chon chuyen khoa</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-[#334155]">Hoc ham / chuc danh</span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                disabled={!canWrite}
                placeholder="BS.CKII"
                className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#334155]">Nam kinh nghiem</span>
              <input
                value={form.experience}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    experience: event.target.value.replace(/\D/g, ""),
                  }))
                }
                disabled={!canWrite}
                inputMode="numeric"
                className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-[#334155]">Chuyen mon</span>
            <input
              value={form.specialization}
              onChange={(event) =>
                setForm((current) => ({ ...current, specialization: event.target.value }))
              }
              disabled={!canWrite}
              placeholder="Tim mach, noi tong quat..."
              className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#334155]">Phi kham</span>
            <input
              value={formatMoneyInput(form.consultationFee)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  consultationFee: parseMoneyInput(event.target.value),
                }))
              }
              disabled={!canWrite}
              inputMode="numeric"
              placeholder="150.000"
              className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
              required
            />
            <p className="mt-1 text-xs text-[#667892]">
              {form.consultationFee
                ? `Tuong duong ${formatCurrency(Number(form.consultationFee))}`
                : "Vi du: 150.000 VND"}
            </p>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#334155]">Gioi thieu</span>
            <textarea
              value={form.bio}
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
              disabled={!canWrite}
              rows={4}
              className="mt-1 w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
            />
          </label>

          <label className="flex items-center justify-between rounded-md border border-[#e5ebf3] px-3 py-2">
            <span className="text-sm font-medium text-[#334155]">San sang nhan lich</span>
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={(event) =>
                setForm((current) => ({ ...current, isAvailable: event.target.checked }))
              }
              disabled={!canWrite}
              className="h-4 w-4 accent-[#0d4f8b]"
            />
          </label>

          {canWrite ? (
            <div className="flex gap-2">
              <button
                disabled={saving}
                className="flex-1 rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60"
              >
                {saving ? "Dang luu..." : editing ? "Luu thay doi" : "Tao ho so"}
              </button>
              {editing ? (
                <button
                  type="button"
                  onClick={startCreate}
                  className="rounded-md border border-[#cfd8e6] px-4 py-2.5 text-sm font-medium text-[#42526b] hover:bg-[#f6f8fb]"
                >
                  Huy
                </button>
              ) : null}
            </div>
          ) : null}
        </form>
      </aside>
    </div>
  );
}
