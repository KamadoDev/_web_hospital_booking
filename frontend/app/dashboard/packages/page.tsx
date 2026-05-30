"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Department, ListResult, MedicalPackage, PackageItem } from "@/lib/types";

type PackageForm = {
  name: string;
  slug: string;
  departmentId: string;
  basePrice: string;
  serviceFee: string;
  summary: string;
  description: string;
  note: string;
  isPopular: boolean;
  isBHYTSupport: boolean;
  isActive: boolean;
};

type ItemForm = {
  name: string;
  description: string;
  price: string;
  included: boolean;
  order: string;
};

const emptyPackageForm: PackageForm = {
  name: "",
  slug: "",
  departmentId: "",
  basePrice: "",
  serviceFee: "0",
  summary: "",
  description: "",
  note: "",
  isPopular: false,
  isBHYTSupport: false,
  isActive: true,
};

const emptyItemForm: ItemForm = {
  name: "",
  description: "",
  price: "0",
  included: true,
  order: "0",
};

const statusOptions = [
  { label: "Tat ca", value: "" },
  { label: "Dang hien thi", value: "true" },
  { label: "Tam an", value: "false" },
];

const popularOptions = [
  { label: "Tat ca", value: "" },
  { label: "Noi bat", value: "true" },
  { label: "Thuong", value: "false" },
];

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

const parseMoneyInput = (value: string) => value.replace(/\D/g, "");

const formatMoneyInput = (value: string) => {
  const digits = parseMoneyInput(value);
  return digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "";
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const toPackageForm = (item: MedicalPackage): PackageForm => ({
  name: item.name,
  slug: item.slug || "",
  departmentId: item.departmentId || "",
  basePrice: String(item.basePrice),
  serviceFee: String(item.serviceFee || 0),
  summary: item.summary || "",
  description: item.description || "",
  note: item.note || "",
  isPopular: item.isPopular,
  isBHYTSupport: item.isBHYTSupport,
  isActive: item.isActive,
});

const toItemForm = (item: PackageItem): ItemForm => ({
  name: item.name,
  description: item.description || "",
  price: String(item.price || 0),
  included: item.included,
  order: String(item.order || 0),
});

const buildPackagePayload = (form: PackageForm) => ({
  name: form.name.trim(),
  slug: form.slug.trim() || undefined,
  departmentId: form.departmentId || null,
  basePrice: Number(form.basePrice || 0),
  serviceFee: Number(form.serviceFee || 0),
  summary: form.summary.trim() || null,
  description: form.description.trim() || null,
  note: form.note.trim() || null,
  isPopular: form.isPopular,
  isBHYTSupport: form.isBHYTSupport,
  isActive: form.isActive,
});

const buildItemPayload = (form: ItemForm) => ({
  name: form.name.trim(),
  description: form.description.trim() || null,
  price: Number(form.price || 0),
  included: form.included,
  order: Number(form.order || 0),
});

export default function PackagesPage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<MedicalPackage[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [popular, setPopular] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<MedicalPackage | null>(null);
  const [form, setForm] = useState<PackageForm>(emptyPackageForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<MedicalPackage | null>(null);
  const [editingItem, setEditingItem] = useState<PackageItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm);
  const listPanelRef = useRef<HTMLElement | null>(null);
  const formPanelRef = useRef<HTMLElement | null>(null);
  const itemPanelRef = useRef<HTMLElement | null>(null);

  const canWrite = user?.role === "ADMIN" || user?.role === "STAFF";
  const canDelete = user?.role === "ADMIN";

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      isActive: status || undefined,
      isPopular: popular || undefined,
      page,
      limit: 10,
    }),
    [page, popular, search, status],
  );

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest<ListResult<MedicalPackage>>("/dashboard/packages", {
        query,
      });
      setPackages(result.items);
      setPagination(result.pagination);
      setSelectedPackage((current) =>
        current ? result.items.find((item) => item.id === current.id) || current : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc danh sach goi kham");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadDepartments = useCallback(async () => {
    try {
      const result = await apiRequest<ListResult<Department>>("/dashboard/departments", {
        query: { isActive: true, limit: 100 },
      });
      setDepartments(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc chuyen khoa");
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPackages();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPackages]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDepartments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDepartments]);

  useEffect(() => {
    if (!notice && !error) return;

    const timeoutId = window.setTimeout(() => {
      setNotice("");
      setError("");
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [error, notice]);

  const scrollToList = () => {
    window.setTimeout(() => {
      listPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const scrollToForm = () => {
    window.setTimeout(() => {
      formPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const scrollToItems = () => {
    window.setTimeout(() => {
      itemPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const startCreate = () => {
    setEditing(null);
    setForm(emptyPackageForm);
    setSlugTouched(false);
    setError("");
    setNotice("");
    scrollToForm();
  };

  const startEdit = (item: MedicalPackage) => {
    setEditing(item);
    setForm(toPackageForm(item));
    setSlugTouched(false);
    setError("");
    setNotice("");
    scrollToForm();
  };

  const handleNameChange = (name: string) => {
    setForm((current) => {
      const currentSlugWasAuto = !current.slug || current.slug === createSlug(current.name);

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
        await apiRequest<MedicalPackage>(`/dashboard/packages/${editing.id}`, {
          method: "PATCH",
          body: buildPackagePayload(form),
        });
        setNotice("Da cap nhat goi kham");
      } else {
        await apiRequest<MedicalPackage>("/dashboard/packages", {
          method: "POST",
          body: buildPackagePayload(form),
        });
        setNotice("Da tao goi kham");
      }

      setEditing(null);
      setForm(emptyPackageForm);
      setSlugTouched(false);
      await loadPackages();
      scrollToList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong luu duoc goi kham");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: MedicalPackage) => {
    if (!canDelete) return;

    const confirmed = window.confirm(`Xoa goi kham "${item.name}"?`);
    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest<MedicalPackage>(`/dashboard/packages/${item.id}`, { method: "DELETE" });
      setNotice("Da xoa goi kham");
      if (selectedPackage?.id === item.id) {
        setSelectedPackage(null);
      }
      await loadPackages();
      scrollToList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong xoa duoc goi kham");
    }
  };

  const openItems = (item: MedicalPackage) => {
    setSelectedPackage(item);
    setEditingItem(null);
    setItemForm({
      ...emptyItemForm,
      order: String(item.items.length),
    });
    scrollToItems();
  };

  const startEditItem = (item: PackageItem) => {
    setEditingItem(item);
    setItemForm(toItemForm(item));
    scrollToItems();
  };

  const handleItemSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite || !selectedPackage) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (editingItem) {
        await apiRequest<PackageItem>(
          `/dashboard/packages/${selectedPackage.id}/items/${editingItem.id}`,
          {
            method: "PATCH",
            body: buildItemPayload(itemForm),
          },
        );
        setNotice("Da cap nhat hang muc");
      } else {
        await apiRequest<PackageItem>(`/dashboard/packages/${selectedPackage.id}/items`, {
          method: "POST",
          body: buildItemPayload(itemForm),
        });
        setNotice("Da tao hang muc");
      }

      setEditingItem(null);
      setItemForm({ ...emptyItemForm, order: String(selectedPackage.items.length + 1) });
      await loadPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong luu duoc hang muc");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item: PackageItem) => {
    if (!canWrite || !selectedPackage) return;

    const confirmed = window.confirm(`Xoa hang muc "${item.name}"?`);
    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest<PackageItem>(`/dashboard/packages/${selectedPackage.id}/items/${item.id}`, {
        method: "DELETE",
      });
      setNotice("Da xoa hang muc");
      await loadPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong xoa duoc hang muc");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
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
            <h2 className="mt-1 text-2xl font-semibold">Goi kham</h2>
            <p className="mt-2 text-sm text-[#667892]">
              Quan ly gia goi, phi dich vu, ho tro BHYT va cac hang muc nam trong goi.
            </p>
          </div>
          {canWrite ? (
            <button
              onClick={startCreate}
              className="rounded-md bg-[#0d4f8b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083d6d]"
            >
              Tao goi kham
            </button>
          ) : null}
        </div>

        <div className="rounded-md border border-[#dce3ee] bg-white">
          <div className="grid gap-3 border-b border-[#e5ebf3] p-4 lg:grid-cols-[1fr_170px_150px]">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Tim theo ten, slug hoac tom tat"
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
            <select
              value={popular}
              onChange={(event) => {
                setPopular(event.target.value);
                setPage(1);
              }}
              className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
            >
              {popularOptions.map((option) => (
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
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Goi kham</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Chuyen khoa</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Gia</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Nhan</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Hang muc</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Lich hen</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 text-right font-semibold">Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[#667892]">
                      Dang tai danh sach...
                    </td>
                  </tr>
                ) : packages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[#667892]">
                      Chua co goi kham phu hop
                    </td>
                  </tr>
                ) : (
                  packages.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <p className="font-semibold text-[#172033]">{item.name}</p>
                        <p className="mt-1 max-w-sm truncate text-xs text-[#667892]">
                          {item.summary || item.slug || "Chua co tom tat"}
                        </p>
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        {item.department?.name || "Tat ca khoa"}
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <p className="font-semibold">{formatCurrency(item.finalPrice)}</p>
                        <p className="mt-1 text-xs text-[#667892]">
                          Goi {formatCurrency(item.basePrice)} + phi {formatCurrency(item.serviceFee)}
                        </p>
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.isPopular ? (
                            <span className="rounded-md bg-[#fff4d6] px-2 py-1 text-xs font-semibold text-[#8a5a00]">
                              Noi bat
                            </span>
                          ) : null}
                          {item.isBHYTSupport ? (
                            <span className="rounded-md bg-[#e7f6ed] px-2 py-1 text-xs font-semibold text-[#1f7a3a]">
                              BHYT
                            </span>
                          ) : null}
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-semibold ${
                              item.isActive
                                ? "bg-[#e7f6ed] text-[#1f7a3a]"
                                : "bg-[#eef2f7] text-[#667892]"
                            }`}
                          >
                            {item.isActive ? "Hien thi" : "Tam an"}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">{item.items.length}</td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">{item._count.appointments}</td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openItems(item)}
                            className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b] hover:bg-[#f6f8fb]"
                          >
                            Hang muc
                          </button>
                          {canWrite ? (
                            <button
                              onClick={() => startEdit(item)}
                              className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b] hover:bg-[#f6f8fb]"
                            >
                              Sua
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              onClick={() => void handleDelete(item)}
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

        {selectedPackage ? (
          <section ref={itemPanelRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-medium text-[#55708f]">Hang muc goi kham</p>
                <h3 className="mt-1 text-xl font-semibold">{selectedPackage.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPackage(null);
                  setEditingItem(null);
                }}
                className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b] hover:bg-[#f6f8fb]"
              >
                Dong
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="overflow-x-auto rounded-md border border-[#e5ebf3]">
                <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-[#667892]">
                      <th className="border-b border-[#e5ebf3] px-3 py-2 font-semibold">Thu tu</th>
                      <th className="border-b border-[#e5ebf3] px-3 py-2 font-semibold">Hang muc</th>
                      <th className="border-b border-[#e5ebf3] px-3 py-2 font-semibold">Gia</th>
                      <th className="border-b border-[#e5ebf3] px-3 py-2 font-semibold">Tinh trong goi</th>
                      <th className="border-b border-[#e5ebf3] px-3 py-2 text-right font-semibold">Thao tac</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPackage.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-[#667892]">
                          Chua co hang muc
                        </td>
                      </tr>
                    ) : (
                      selectedPackage.items.map((item) => (
                        <tr key={item.id}>
                          <td className="border-b border-[#eef2f7] px-3 py-2">{item.order}</td>
                          <td className="border-b border-[#eef2f7] px-3 py-2">
                            <p className="font-semibold">{item.name}</p>
                            <p className="mt-1 text-xs text-[#667892]">
                              {item.description || "Chua co mo ta"}
                            </p>
                          </td>
                          <td className="border-b border-[#eef2f7] px-3 py-2">{formatCurrency(item.price)}</td>
                          <td className="border-b border-[#eef2f7] px-3 py-2">
                            {item.included ? "Co" : "Tinh rieng"}
                          </td>
                          <td className="border-b border-[#eef2f7] px-3 py-2">
                            <div className="flex justify-end gap-2">
                              {canWrite ? (
                                <>
                                  <button
                                    onClick={() => startEditItem(item)}
                                    className="rounded-md border border-[#cfd8e6] px-2 py-1 text-xs text-[#42526b]"
                                  >
                                    Sua
                                  </button>
                                  <button
                                    onClick={() => void handleDeleteItem(item)}
                                    className="rounded-md border border-[#f2b8b5] px-2 py-1 text-xs text-[#b3261e]"
                                  >
                                    Xoa
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {canWrite ? (
                <form className="space-y-3 rounded-md border border-[#e5ebf3] p-4" onSubmit={handleItemSubmit}>
                  <h4 className="font-semibold">{editingItem ? "Sua hang muc" : "Them hang muc"}</h4>
                  <input
                    value={itemForm.name}
                    onChange={(event) =>
                      setItemForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Ten hang muc"
                    className="w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
                    required
                  />
                  <textarea
                    value={itemForm.description}
                    onChange={(event) =>
                      setItemForm((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Mo ta"
                    rows={3}
                    className="w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-medium text-[#667892]">Gia</span>
                      <input
                        value={formatMoneyInput(itemForm.price)}
                        onChange={(event) =>
                          setItemForm((current) => ({
                            ...current,
                            price: parseMoneyInput(event.target.value),
                          }))
                        }
                        placeholder="0"
                        inputMode="numeric"
                        className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-[#667892]">Thu tu</span>
                      <input
                        value={itemForm.order}
                        onChange={(event) =>
                          setItemForm((current) => ({
                            ...current,
                            order: event.target.value.replace(/\D/g, ""),
                          }))
                        }
                        inputMode="numeric"
                        className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
                      />
                    </label>
                  </div>
                  <label className="flex items-center justify-between rounded-md border border-[#e5ebf3] px-3 py-2">
                    <span className="text-sm font-medium text-[#334155]">Nam trong goi</span>
                    <input
                      type="checkbox"
                      checked={itemForm.included}
                      onChange={(event) =>
                        setItemForm((current) => ({ ...current, included: event.target.checked }))
                      }
                      className="h-4 w-4 accent-[#0d4f8b]"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      disabled={saving}
                      className="flex-1 rounded-md bg-[#0d4f8b] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {saving ? "Dang luu..." : editingItem ? "Luu hang muc" : "Them hang muc"}
                    </button>
                    {editingItem ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(null);
                          setItemForm({ ...emptyItemForm, order: String(selectedPackage.items.length) });
                        }}
                        className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]"
                      >
                        Huy
                      </button>
                    ) : null}
                  </div>
                </form>
              ) : null}
            </div>
          </section>
        ) : null}
      </section>

      <aside
        ref={formPanelRef}
        className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5 xl:sticky xl:top-24 xl:self-start"
      >
        <h3 className="text-lg font-semibold">{editing ? "Cap nhat goi kham" : "Tao goi kham"}</h3>
        <p className="mt-2 text-sm leading-6 text-[#667892]">
          Slug tu sinh theo ten goi. Backend hien chua co field anh cho goi kham, nen UI chua upload anh o man nay.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-[#334155]">Ten goi kham</span>
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
            <span className="text-sm font-medium text-[#334155]">Chuyen khoa</span>
            <select
              value={form.departmentId}
              onChange={(event) =>
                setForm((current) => ({ ...current, departmentId: event.target.value }))
              }
              disabled={!canWrite}
              className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
            >
              <option value="">Tat ca khoa</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-[#334155]">Gia goi</span>
              <input
                value={formatMoneyInput(form.basePrice)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    basePrice: parseMoneyInput(event.target.value),
                  }))
                }
                disabled={!canWrite}
                placeholder="500.000"
                inputMode="numeric"
                className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[#334155]">Phi dich vu</span>
              <input
                value={formatMoneyInput(form.serviceFee)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    serviceFee: parseMoneyInput(event.target.value),
                  }))
                }
                disabled={!canWrite}
                placeholder="0"
                inputMode="numeric"
                className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
              />
            </label>
          </div>
          <p className="text-xs text-[#667892]">
            Tong hien thi: {formatCurrency(Number(form.basePrice || 0) + Number(form.serviceFee || 0))}
          </p>
          <label className="block">
            <span className="text-sm font-medium text-[#334155]">Tom tat</span>
            <input
              value={form.summary}
              onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
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
              rows={3}
              className="mt-1 w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-[#334155]">Ghi chu</span>
            <textarea
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              disabled={!canWrite}
              rows={2}
              className="mt-1 w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f6f8fb]"
            />
          </label>
          <div className="space-y-2">
            {[
              ["isPopular", "Goi noi bat"],
              ["isBHYTSupport", "Ho tro BHYT"],
              ["isActive", "Dang hien thi"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-md border border-[#e5ebf3] px-3 py-2">
                <span className="text-sm font-medium text-[#334155]">{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(form[key as keyof PackageForm])}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [key]: event.target.checked }))
                  }
                  disabled={!canWrite}
                  className="h-4 w-4 accent-[#0d4f8b]"
                />
              </label>
            ))}
          </div>

          {canWrite ? (
            <div className="flex gap-2">
              <button
                disabled={saving}
                className="flex-1 rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60"
              >
                {saving ? "Dang luu..." : editing ? "Luu thay doi" : "Tao goi kham"}
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
