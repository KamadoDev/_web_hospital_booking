"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, uploadImages } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { DashboardRole, DashboardUser, ListResult } from "@/lib/types";

type UserForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: DashboardRole;
  avatar: string;
  avatarAssetId: string;
  isActive: boolean;
};

const emptyForm: UserForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  role: "STAFF",
  avatar: "",
  avatarAssetId: "",
  isActive: true,
};

const roleOptions: { value: "" | DashboardRole; label: string }[] = [
  { value: "", label: "Tat ca vai tro" },
  { value: "ADMIN", label: "Quan tri" },
  { value: "STAFF", label: "Nhan vien" },
  { value: "DOCTOR", label: "Bac si" },
];

const statusOptions = [
  { value: "", label: "Tat ca trang thai" },
  { value: "true", label: "Dang hoat dong" },
  { value: "false", label: "Da khoa" },
];

const roleLabel: Record<DashboardRole, string> = {
  ADMIN: "Quan tri",
  STAFF: "Nhan vien",
  DOCTOR: "Bac si",
};

const toForm = (user: DashboardUser): UserForm => ({
  fullName: user.fullName,
  email: user.email || "",
  phone: user.phone || "",
  password: "",
  role: user.role,
  avatar: user.avatar || "",
  avatarAssetId: "",
  isActive: user.isActive ?? true,
});

const buildCreatePayload = (form: UserForm) => ({
  fullName: form.fullName.trim(),
  email: form.email.trim() || undefined,
  phone: form.phone.trim(),
  password: form.password,
  role: form.role,
  avatar: form.avatar.trim() || undefined,
  avatarAssetId: form.avatarAssetId || undefined,
  isActive: form.isActive,
});

const buildUpdatePayload = (form: UserForm) => ({
  fullName: form.fullName.trim(),
  email: form.email.trim() || null,
  phone: form.phone.trim(),
  role: form.role,
  avatar: form.avatar.trim() || null,
  avatarAssetId: form.avatarAssetId || undefined,
  isActive: form.isActive,
});

export default function UsersPage() {
  const { user, refreshUser, logout } = useAuth();
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<DashboardUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [passwordTarget, setPasswordTarget] = useState<DashboardUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const listRef = useRef<HTMLElement | null>(null);
  const formRef = useRef<HTMLElement | null>(null);

  const canUse = user?.role === "ADMIN";

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      role: role || undefined,
      isActive: isActive || undefined,
      page,
      limit: 20,
    }),
    [isActive, page, role, search],
  );

  const loadUsers = useCallback(async () => {
    if (!canUse) return;
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<ListResult<DashboardUser>>("/dashboard/users", {
        query,
      });
      setUsers(result.items);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc danh sach nhan su");
    } finally {
      setLoading(false);
    }
  }, [canUse, query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadUsers(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadUsers]);

  useEffect(() => {
    if (!notice && !error) return;
    const timeoutId = window.setTimeout(() => {
      setNotice("");
      setError("");
    }, 4500);
    return () => window.clearTimeout(timeoutId);
  }, [error, notice]);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    window.setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setNotice("");
    scrollTo(formRef);
  };

  const startEdit = (item: DashboardUser) => {
    setEditing(item);
    setForm(toForm(item));
    setError("");
    setNotice("");
    scrollTo(formRef);
  };

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const [asset] = await uploadImages([file], "users");
      if (!asset) throw new Error("Upload thanh cong nhung khong nhan duoc URL avatar");
      setForm((current) => ({
        ...current,
        avatar: asset.url,
        avatarAssetId: asset.id,
      }));
      setNotice("Da upload avatar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong upload duoc avatar");
    } finally {
      setUploading(false);
    }
  };

  const saveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUse) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editing) {
        const updatedUser = await apiRequest<DashboardUser>(`/dashboard/users/${editing.id}`, {
          method: "PATCH",
          body: buildUpdatePayload(form),
        });
        const roleChanged = editing.role !== updatedUser.role;
        setNotice(
          roleChanged
            ? `Da doi vai tro ${updatedUser.fullName} tu ${roleLabel[editing.role]} sang ${roleLabel[updatedUser.role]}`
            : "Da cap nhat nhan su",
        );
        if (editing.id === user?.id) {
          const currentUser = await refreshUser();
          if (updatedUser.role !== "ADMIN" || currentUser?.role !== "ADMIN") {
            window.location.href = "/dashboard";
            return;
          }
        }
      } else {
        await apiRequest<DashboardUser>("/dashboard/users", {
          method: "POST",
          body: buildCreatePayload(form),
        });
        setNotice("Da tao tai khoan nhan su");
      }
      setEditing(null);
      setForm(emptyForm);
      await loadUsers();
      scrollTo(listRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong luu duoc nhan su");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item: DashboardUser) => {
    if (!canUse) return;
    setError("");
    setNotice("");
    try {
      await apiRequest<DashboardUser>(`/dashboard/users/${item.id}/status`, {
        method: "PATCH",
        body: { isActive: !(item.isActive ?? true) },
      });
      setNotice("Da cap nhat trang thai tai khoan");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong cap nhat duoc trang thai");
    }
  };

  const startUpdatePassword = (item: DashboardUser) => {
    setPasswordTarget(item);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setNotice("");
    scrollTo(formRef);
  };

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordTarget || !canUse) return;

    const password = newPassword;
    if (password.length < 6) {
      setError("Mat khau toi thieu 6 ky tu");
      return;
    }
    if (password !== confirmPassword) {
      setError("Xac nhan mat khau chua khop");
      return;
    }

    if (!canUse) return;
    setError("");
    setNotice("");
    try {
      await apiRequest<DashboardUser>(`/dashboard/users/${passwordTarget.id}/password`, {
        method: "PATCH",
        body: { password },
      });
      const shouldLogout = passwordTarget.id === user?.id;
      setPasswordTarget(null);
      setNewPassword("");
      setConfirmPassword("");
      if (shouldLogout) {
        setNotice("Da doi mat khau. Vui long dang nhap lai.");
        await logout();
        return;
      }
      setNotice("Da cap nhat mat khau");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong cap nhat duoc mat khau");
    }
  };

  if (!canUse) {
    return (
      <section className="rounded-md border border-[#dce3ee] bg-white p-6">
        <p className="text-sm font-medium text-[#55708f]">Quan tri he thong</p>
        <h2 className="mt-1 text-2xl font-semibold">Nhan su</h2>
        <p className="mt-2 text-sm text-[#667892]">Module nhan su chi danh cho ADMIN.</p>
      </section>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
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
        <div className="flex flex-col gap-3 rounded-md border border-[#dce3ee] bg-white p-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#55708f]">Quan tri he thong</p>
            <h2 className="mt-1 text-2xl font-semibold">Nhan su</h2>
            <p className="mt-2 text-sm text-[#667892]">Quan ly tai khoan ADMIN, STAFF va DOCTOR.</p>
          </div>
          <button onClick={startCreate} className="rounded-md bg-[#0d4f8b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083d6d]">Tao tai khoan</button>
        </div>

        <div className="rounded-md border border-[#dce3ee] bg-white">
          <div className="grid gap-3 border-b border-[#e5ebf3] p-4 lg:grid-cols-[1fr_170px_170px]">
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tim ten, SĐT, email" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
            <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              {roleOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={isActive} onChange={(e) => { setIsActive(e.target.value); setPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
              {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-[#667892]">
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Nhan su</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Lien he</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Vai tro</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Trang thai</th>
                  <th className="border-b border-[#e5ebf3] px-4 py-3 text-right font-semibold">Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-[#667892]">Dang tai nhan su...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-[#667892]">Chua co nhan su phu hop</td></tr>
                ) : users.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.avatar} alt={item.fullName} className="h-10 w-10 rounded-md object-cover" />
                        ) : <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e7f0fb] text-sm font-semibold text-[#0d4f8b]">{item.fullName.slice(0, 1).toUpperCase()}</div>}
                        <div><p className="font-semibold">{item.fullName}</p><p className="mt-1 text-xs text-[#667892]">{item.id}</p></div>
                      </div>
                    </td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><p>{item.phone || "-"}</p><p className="mt-1 text-xs text-[#667892]">{item.email || "-"}</p></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">{roleLabel[item.role]}</td>
                    <td className="border-b border-[#eef2f7] px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${(item.isActive ?? true) ? "bg-[#e7f6ed] text-[#1f7a3a]" : "bg-[#eef2f7] text-[#667892]"}`}>{(item.isActive ?? true) ? "Hoat dong" : "Da khoa"}</span></td>
                    <td className="border-b border-[#eef2f7] px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => startEdit(item)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Sua</button>
                        <button onClick={() => void toggleStatus(item)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">{(item.isActive ?? true) ? "Khoa" : "Mo khoa"}</button>
                        <button onClick={() => startUpdatePassword(item)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Doi mat khau</button>
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

      <aside ref={formRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5 xl:sticky xl:top-24 xl:self-start">
        <h3 className="text-lg font-semibold">{editing ? "Cap nhat nhan su" : "Tao tai khoan"}</h3>
        {passwordTarget ? (
          <form className="mt-5 rounded-md border border-[#e5ebf3] bg-[#f8fafc] p-4" onSubmit={updatePassword}>
            <h4 className="font-semibold">Doi mat khau</h4>
            <p className="mt-1 text-sm text-[#667892]">{passwordTarget.fullName}</p>
            <label className="mt-3 block">
              <span className="text-sm font-medium text-[#334155]">Mat khau moi</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
                required
              />
            </label>
            <label className="mt-3 block">
              <span className="text-sm font-medium text-[#334155]">Xac nhan mat khau</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"
                required
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 rounded-md bg-[#0d4f8b] px-3 py-2 text-sm font-semibold text-white">
                Cap nhat
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordTarget(null);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]"
              >
                Huy
              </button>
            </div>
          </form>
        ) : null}
        <form className="mt-5 space-y-4" onSubmit={saveUser}>
          <label className="block"><span className="text-sm font-medium text-[#334155]">Ho ten</span><input value={form.fullName} onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-sm font-medium text-[#334155]">So dien thoai</span><input value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} placeholder="0901234567" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required /></label>
            <label className="block"><span className="text-sm font-medium text-[#334155]">Vai tro</span><select value={form.role} onChange={(e) => setForm((current) => ({ ...current, role: e.target.value as DashboardRole }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"><option value="ADMIN">Quan tri</option><option value="STAFF">Nhan vien</option><option value="DOCTOR">Bac si</option></select></label>
          </div>
          <label className="block"><span className="text-sm font-medium text-[#334155]">Email</span><input value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} placeholder="email@example.com" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" /></label>
          {!editing ? <label className="block"><span className="text-sm font-medium text-[#334155]">Mat khau</span><input type="password" value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required /></label> : null}
          <label className="block"><span className="text-sm font-medium text-[#334155]">Avatar URL</span><input value={form.avatar} onChange={(e) => setForm((current) => ({ ...current, avatar: e.target.value, avatarAssetId: "" }))} placeholder="https://..." className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" /></label>
          <label className="block">
            <span className="text-sm font-medium text-[#334155]">Upload avatar</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(e) => void uploadAvatar(e.target.files?.[0])} className="mt-1 w-full rounded-md border border-dashed border-[#cfd8e6] bg-[#f8fafc] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0d4f8b] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:opacity-60" />
            <p className="mt-1 text-xs text-[#667892]">Ho tro JPG, PNG, WEBP. Folder upload: users.</p>
          </label>
          {form.avatar ? (
            <div className="rounded-md border border-[#e5ebf3] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.avatar}
                alt="Preview avatar"
                className="h-36 w-full rounded-md object-cover"
              />
              <p className="mt-2 truncate text-xs text-[#667892]">
                {form.avatarAssetId || form.avatar}
              </p>
            </div>
          ) : null}
          <label className="flex items-center justify-between rounded-md border border-[#e5ebf3] px-3 py-2"><span className="text-sm font-medium text-[#334155]">Dang hoat dong</span><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.checked }))} className="h-4 w-4 accent-[#0d4f8b]" /></label>
          <div className="flex gap-2">
            <button disabled={saving || uploading} className="flex-1 rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60">{uploading ? "Dang upload..." : saving ? "Dang luu..." : editing ? "Luu thay doi" : "Tao tai khoan"}</button>
            {editing ? <button type="button" onClick={startCreate} className="rounded-md border border-[#cfd8e6] px-4 py-2.5 text-sm font-medium text-[#42526b]">Huy</button> : null}
          </div>
        </form>
      </aside>
    </div>
  );
}
