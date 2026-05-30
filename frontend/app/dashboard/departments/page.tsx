"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, uploadImages } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Department, ListResult } from "@/lib/types";

type DepartmentForm = {
  name: string;
  slug: string;
  description: string;
  image: string;
  imageAssetId: string;
  isActive: boolean;
};

const emptyForm: DepartmentForm = {
  name: "",
  slug: "",
  description: "",
  image: "",
  imageAssetId: "",
  isActive: true,
};

const statusOptions = [
  { label: "Tat ca", value: "" },
  { label: "Dang hoat dong", value: "true" },
  { label: "Tam an", value: "false" },
];

const toForm = (department: Department): DepartmentForm => ({
  name: department.name,
  slug: department.slug || "",
  description: department.description || "",
  image: department.image || "",
  imageAssetId: "",
  isActive: department.isActive,
});

const createSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildPayload = (form: DepartmentForm) => ({
  name: form.name.trim(),
  slug: form.slug.trim() || undefined,
  description: form.description.trim() || null,
  image: form.image.trim() || null,
  imageAssetId: form.imageAssetId || undefined,
  isActive: form.isActive,
});

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState<DepartmentForm>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const listPanelRef = useRef<HTMLElement | null>(null);
  const formPanelRef = useRef<HTMLElement | null>(null);

  const canWrite = user?.role === "ADMIN" || user?.role === "STAFF";
  const canDelete = user?.role === "ADMIN";

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      isActive: status || undefined,
      page,
      limit: 10,
    }),
    [page, search, status],
  );

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest<ListResult<Department>>("/dashboard/departments", {
        query,
      });
      setDepartments(result.items);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc danh sach chuyen khoa");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDepartments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDepartments]);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setNotice("");
    setError("");
    window.setTimeout(() => {
      formPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const startEdit = (department: Department) => {
    setEditing(department);
    setForm(toForm(department));
    setSlugTouched(false);
    setNotice("");
    setError("");
    window.setTimeout(() => {
      formPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleNameChange = (name: string) => {
    setForm((current) => {
      const currentSlugWasAuto =
        !current.slug || current.slug === createSlug(current.name);

      return {
        ...current,
        name,
        slug: !slugTouched && currentSlugWasAuto ? createSlug(name) : current.slug,
      };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canWrite) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (editing) {
        await apiRequest<Department>(`/dashboard/departments/${editing.id}`, {
          method: "PATCH",
          body: buildPayload(form),
        });
        setNotice("Da cap nhat chuyen khoa");
      } else {
        await apiRequest<Department>("/dashboard/departments", {
          method: "POST",
          body: buildPayload(form),
        });
        setNotice("Da tao chuyen khoa");
      }

      setEditing(null);
      setForm(emptyForm);
      setSlugTouched(false);
      await loadDepartments();
      window.setTimeout(() => {
        listPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong luu duoc chuyen khoa");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File | undefined) => {
    if (!file || !canWrite) return;

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const [asset] = await uploadImages([file], "departments");

      if (!asset) {
        throw new Error("Upload thanh cong nhung khong nhan duoc thong tin anh");
      }

      setForm((current) => ({
        ...current,
        image: asset.url,
        imageAssetId: asset.id,
      }));
      setNotice("Da upload anh chuyen khoa");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong upload duoc anh");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (department: Department) => {
    if (!canDelete) return;

    const confirmed = window.confirm(`Xoa chuyen khoa "${department.name}"?`);
    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest<Department>(`/dashboard/departments/${department.id}`, {
        method: "DELETE",
      });
      setNotice("Da xoa chuyen khoa");
      await loadDepartments();
      window.setTimeout(() => {
        listPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong xoa duoc chuyen khoa");
    }
  };

  useEffect(() => {
    if (!notice && !error) return;

    const timeoutId = window.setTimeout(() => {
      setNotice("");
      setError("");
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [error, notice]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
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
            <h2 className="mt-1 text-2xl font-semibold">Chuyen khoa</h2>
            <p className="mt-2 text-sm text-[#667892]">
              Quan ly danh muc khoa phong dung cho bac si, goi kham va lich hen.
            </p>
          </div>
          {canWrite ? (
            <button
              onClick={startCreate}
              className="rounded-md bg-[#0d4f8b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083d6d]"
            >
              Tao moi
            </button>
          ) : null}
        </div>

        <div className="rounded-md border border-[#dce3ee] bg-white">
          <div className="grid gap-3 border-b border-[#e5ebf3] p-4 md:grid-cols-[1fr_180px]">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Tim theo ten hoac slug"
              className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
            />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#667892]">
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Ten khoa</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Slug</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Bac si</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Lich hen</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Trang thai</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 text-right font-semibold">
                    Thao tac
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#667892]">
                      Dang tai danh sach...
                    </td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#667892]">
                      Chua co chuyen khoa phu hop
                    </td>
                  </tr>
                ) : (
                  departments.map((department) => (
                    <tr key={department.id} className="align-top">
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <p className="font-semibold text-[#172033]">{department.name}</p>
                        <p className="mt-1 max-w-sm truncate text-xs text-[#667892]">
                          {department.description || "Chua co mo ta"}
                        </p>
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3 text-[#42526b]">
                        {department.slug || "-"}
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        {department._count.doctors}
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        {department._count.appointments}
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                            department.isActive
                              ? "bg-[#e7f6ed] text-[#1f7a3a]"
                              : "bg-[#eef2f7] text-[#667892]"
                          }`}
                        >
                          {department.isActive ? "Hoat dong" : "Tam an"}
                        </span>
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canWrite ? (
                            <button
                              onClick={() => startEdit(department)}
                              className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b] hover:bg-[#f6f8fb]"
                            >
                              Sua
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              onClick={() => void handleDelete(department)}
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
          {editing ? "Cap nhat chuyen khoa" : "Tao chuyen khoa"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#667892]">
          {canWrite
            ? "Slug co the bo trong, backend se tu sinh tu ten chuyen khoa."
            : "Tai khoan cua ban chi co quyen xem danh muc nay."}
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-[#334155]">Ten chuyen khoa</span>
            <input
              value={form.name}
              onChange={(event) => handleNameChange(event.target.value)}
              disabled={!canWrite}
              className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#334155]">Slug</span>
            <input
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true);
                setForm((current) => ({ ...current, slug: createSlug(event.target.value) }));
              }}
              disabled={!canWrite}
              className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#334155]">Mo ta</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              disabled={!canWrite}
              rows={4}
              className="mt-1 w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#334155]">URL hinh anh</span>
            <input
              value={form.image}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  image: event.target.value,
                  imageAssetId: "",
                }))
              }
              disabled={!canWrite}
              placeholder="https://..."
              className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#334155]">Upload anh</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={!canWrite || uploading}
              onChange={(event) => void handleImageUpload(event.target.files?.[0])}
              className="mt-1 w-full rounded-md border border-dashed border-[#cfd8e6] bg-[#f8fafc] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0d4f8b] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-[#667892]">
              Ho tro JPG, PNG, WEBP toi da 5MB. Anh se duoc upload vao folder departments.
            </p>
          </label>
          {form.image ? (
            <div className="rounded-md border border-[#e5ebf3] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.image}
                alt={form.name || "Anh chuyen khoa"}
                className="h-36 w-full rounded-md object-cover"
              />
              <p className="mt-2 truncate text-xs text-[#667892]">
                {form.imageAssetId ? `Asset: ${form.imageAssetId}` : form.image}
              </p>
            </div>
          ) : null}
          <label className="flex items-center justify-between rounded-md border border-[#e5ebf3] px-3 py-2">
            <span className="text-sm font-medium text-[#334155]">Dang hoat dong</span>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({ ...current, isActive: event.target.checked }))
              }
              disabled={!canWrite}
              className="h-4 w-4 accent-[#0d4f8b]"
            />
          </label>

          {canWrite ? (
            <div className="flex gap-2">
              <button
                disabled={saving || uploading}
                className="flex-1 rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60"
              >
                {uploading ? "Dang upload..." : saving ? "Dang luu..." : editing ? "Luu thay doi" : "Tao moi"}
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
