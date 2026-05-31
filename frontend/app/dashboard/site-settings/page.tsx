"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, uploadImages } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Banner, MediaAsset, PublicFAQ, SiteSettingsRecord, SiteSettingsValue } from "@/lib/types";

type TabKey = "settings" | "banners" | "faqs";

type ListResponse<T> = {
  items: T[];
};

type SiteForm = SiteSettingsValue & {
  logoAssetId: string;
  faviconAssetId: string;
  facebook: string;
  zalo: string;
  youtube: string;
  tiktok: string;
};

type BannerForm = {
  title: string;
  subtitle: string;
  image: string;
  imageAssetId: string;
  mobileImage: string;
  mobileImageAssetId: string;
  linkUrl: string;
  target: string;
  position: string;
  order: string;
  isActive: boolean;
  startAt: string;
  endAt: string;
};

type FAQForm = {
  question: string;
  answer: string;
  category: string;
  order: string;
  isActive: boolean;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "settings", label: "Thông tin website" },
  { key: "banners", label: "Banner" },
  { key: "faqs", label: "FAQ website" },
];

const emptySiteForm: SiteForm = {
  hospitalName: "",
  logo: "",
  logoAssetId: "",
  favicon: "",
  faviconAssetId: "",
  hotline: "",
  emergencyHotline: "",
  email: "",
  address: "",
  workingHours: "",
  mapUrl: "",
  socialLinks: {},
  facebook: "",
  zalo: "",
  youtube: "",
  tiktok: "",
};

const emptyBannerForm: BannerForm = {
  title: "",
  subtitle: "",
  image: "",
  imageAssetId: "",
  mobileImage: "",
  mobileImageAssetId: "",
  linkUrl: "",
  target: "_self",
  position: "HOME_HERO",
  order: "0",
  isActive: true,
  startAt: "",
  endAt: "",
};

const emptyFAQForm: FAQForm = {
  question: "",
  answer: "",
  category: "booking",
  order: "0",
  isActive: true,
};

const positionOptions = ["HOME_HERO", "HOME_PROMO", "HOME_DEPARTMENT", "FOOTER"];
const faqCategories = ["booking", "payment", "doctor", "insurance", "general"];

const toNullable = (value: string) => value.trim() || null;

const toDateTimeInput = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const toIsoDateTime = (value: string) => (value ? new Date(value).toISOString() : null);

const toSiteForm = (settings?: SiteSettingsValue): SiteForm => {
  const socialLinks = settings?.socialLinks || {};
  return {
    ...emptySiteForm,
    ...settings,
    hospitalName: settings?.hospitalName || "",
    logo: settings?.logo || "",
    logoAssetId: "",
    favicon: settings?.favicon || "",
    faviconAssetId: "",
    hotline: settings?.hotline || "",
    emergencyHotline: settings?.emergencyHotline || "",
    email: settings?.email || "",
    address: settings?.address || "",
    workingHours: settings?.workingHours || "",
    mapUrl: settings?.mapUrl || "",
    socialLinks,
    facebook: socialLinks.facebook || "",
    zalo: socialLinks.zalo || "",
    youtube: socialLinks.youtube || "",
    tiktok: socialLinks.tiktok || "",
  };
};

const toBannerForm = (banner: Banner): BannerForm => ({
  title: banner.title,
  subtitle: banner.subtitle || "",
  image: banner.image,
  imageAssetId: "",
  mobileImage: banner.mobileImage || "",
  mobileImageAssetId: "",
  linkUrl: banner.linkUrl || "",
  target: banner.target || "_self",
  position: banner.position,
  order: String(banner.order),
  isActive: banner.isActive,
  startAt: toDateTimeInput(banner.startAt),
  endAt: toDateTimeInput(banner.endAt),
});

const toFAQForm = (faq: PublicFAQ): FAQForm => ({
  question: faq.question,
  answer: faq.answer,
  category: faq.category || "",
  order: String(faq.order),
  isActive: faq.isActive,
});

export default function SiteSettingsPage() {
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN";
  const canManage = user?.role === "ADMIN" || user?.role === "STAFF";
  const [activeTab, setActiveTab] = useState<TabKey>("settings");
  const [siteRecord, setSiteRecord] = useState<SiteSettingsRecord | null>(null);
  const [siteForm, setSiteForm] = useState<SiteForm>(emptySiteForm);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerForm, setBannerForm] = useState<BannerForm>(emptyBannerForm);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteBanner, setDeleteBanner] = useState<Banner | null>(null);
  const [bannerPosition, setBannerPosition] = useState("");
  const [bannerActive, setBannerActive] = useState("");
  const [faqs, setFaqs] = useState<PublicFAQ[]>([]);
  const [faqForm, setFAQForm] = useState<FAQForm>(emptyFAQForm);
  const [editingFAQ, setEditingFAQ] = useState<PublicFAQ | null>(null);
  const [deleteFAQ, setDeleteFAQ] = useState<PublicFAQ | null>(null);
  const [faqCategory, setFAQCategory] = useState("");
  const [faqActive, setFAQActive] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const bannerListRef = useRef<HTMLElement | null>(null);
  const bannerFormRef = useRef<HTMLElement | null>(null);
  const faqListRef = useRef<HTMLElement | null>(null);
  const faqFormRef = useRef<HTMLElement | null>(null);

  const bannerQuery = useMemo(
    () => ({
      position: bannerPosition || undefined,
      isActive: bannerActive || undefined,
    }),
    [bannerActive, bannerPosition],
  );

  const faqQuery = useMemo(
    () => ({
      category: faqCategory || undefined,
      isActive: faqActive || undefined,
    }),
    [faqActive, faqCategory],
  );

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    window.setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const loadSiteSettings = useCallback(async () => {
    if (!canManage) return;
    const result = await apiRequest<SiteSettingsRecord>("/dashboard/site-settings");
    setSiteRecord(result);
    setSiteForm(toSiteForm(result.value));
  }, [canManage]);

  const loadBanners = useCallback(async () => {
    if (!canManage) return;
    const result = await apiRequest<ListResponse<Banner>>("/dashboard/banners", {
      query: bannerQuery,
    });
    setBanners(result.items);
  }, [bannerQuery, canManage]);

  const loadFAQs = useCallback(async () => {
    if (!canManage) return;
    const result = await apiRequest<ListResponse<PublicFAQ>>("/dashboard/faqs", {
      query: faqQuery,
    });
    setFaqs(result.items);
  }, [canManage, faqQuery]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadSiteSettings(), loadBanners(), loadFAQs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được cấu hình website");
    } finally {
      setLoading(false);
    }
  }, [loadBanners, loadFAQs, loadSiteSettings]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadAll(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadAll]);

  useEffect(() => {
    if (!notice && !error) return;
    const timeoutId = window.setTimeout(() => {
      setNotice("");
      setError("");
    }, 4500);
    return () => window.clearTimeout(timeoutId);
  }, [error, notice]);

  const uploadToForm = async (
    file: File | undefined,
    folder: string,
    key: string,
    setter: (asset: MediaAsset) => void,
  ) => {
    if (!file) return;
    setUploading(key);
    setError("");
    setNotice("");
    try {
      const [asset] = await uploadImages([file], folder);
      if (!asset) throw new Error("Upload thành công nhưng không nhận được URL ảnh");
      setter(asset);
      setNotice("Đã upload ảnh");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không upload được ảnh");
    } finally {
      setUploading("");
    }
  };

  const saveSiteSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const socialLinks = {
        ...(siteForm.facebook.trim() ? { facebook: siteForm.facebook.trim() } : {}),
        ...(siteForm.zalo.trim() ? { zalo: siteForm.zalo.trim() } : {}),
        ...(siteForm.youtube.trim() ? { youtube: siteForm.youtube.trim() } : {}),
        ...(siteForm.tiktok.trim() ? { tiktok: siteForm.tiktok.trim() } : {}),
      };
      const payload: Partial<SiteSettingsValue> & {
        logoAssetId?: string;
        faviconAssetId?: string;
      } = {
        hospitalName: toNullable(siteForm.hospitalName || ""),
        logo: toNullable(siteForm.logo || ""),
        logoAssetId: siteForm.logoAssetId || undefined,
        favicon: toNullable(siteForm.favicon || ""),
        faviconAssetId: siteForm.faviconAssetId || undefined,
        hotline: toNullable(siteForm.hotline || ""),
        emergencyHotline: toNullable(siteForm.emergencyHotline || ""),
        email: toNullable(siteForm.email || ""),
        address: toNullable(siteForm.address || ""),
        workingHours: toNullable(siteForm.workingHours || ""),
        mapUrl: toNullable(siteForm.mapUrl || ""),
        socialLinks,
      };
      const updated = await apiRequest<SiteSettingsRecord>("/dashboard/site-settings", {
        method: "PATCH",
        body: payload,
      });
      setSiteRecord(updated);
      setSiteForm(toSiteForm(updated.value));
      setNotice("Đã cập nhật thông tin website");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được thông tin website");
    } finally {
      setSaving(false);
    }
  };

  const startCreateBanner = () => {
    setEditingBanner(null);
    setDeleteBanner(null);
    setBannerForm(emptyBannerForm);
    setActiveTab("banners");
    scrollTo(bannerFormRef);
  };

  const startEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setDeleteBanner(null);
    setBannerForm(toBannerForm(banner));
    setActiveTab("banners");
    scrollTo(bannerFormRef);
  };

  const saveBanner = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const body = {
        title: bannerForm.title.trim(),
        subtitle: toNullable(bannerForm.subtitle),
        image: bannerForm.image.trim(),
        imageAssetId: bannerForm.imageAssetId || undefined,
        mobileImage: toNullable(bannerForm.mobileImage),
        mobileImageAssetId: bannerForm.mobileImageAssetId || undefined,
        linkUrl: toNullable(bannerForm.linkUrl),
        target: toNullable(bannerForm.target),
        position: bannerForm.position.trim() || "HOME_HERO",
        order: Number(bannerForm.order || 0),
        isActive: bannerForm.isActive,
        startAt: toIsoDateTime(bannerForm.startAt),
        endAt: toIsoDateTime(bannerForm.endAt),
      };
      if (editingBanner) {
        await apiRequest<Banner>(`/dashboard/banners/${editingBanner.id}`, {
          method: "PATCH",
          body,
        });
        setNotice("Đã cập nhật banner");
      } else {
        await apiRequest<Banner>("/dashboard/banners", {
          method: "POST",
          body,
        });
        setNotice("Đã tạo banner");
      }
      setEditingBanner(null);
      setBannerForm(emptyBannerForm);
      await loadBanners();
      scrollTo(bannerListRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được banner");
    } finally {
      setSaving(false);
    }
  };

  const toggleBanner = async (banner: Banner) => {
    if (!canManage) return;
    setError("");
    setNotice("");
    try {
      await apiRequest<Banner>(`/dashboard/banners/${banner.id}`, {
        method: "PATCH",
        body: { isActive: !banner.isActive },
      });
      setNotice(banner.isActive ? "Đã tắt banner" : "Đã bật banner");
      await loadBanners();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được banner");
    }
  };

  const confirmDeleteBanner = async () => {
    if (!canWrite || !deleteBanner) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<Banner>(`/dashboard/banners/${deleteBanner.id}`, { method: "DELETE" });
      setDeleteBanner(null);
      setNotice("Đã xoá banner");
      await loadBanners();
      scrollTo(bannerListRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xoá được banner");
    } finally {
      setSaving(false);
    }
  };

  const startCreateFAQ = () => {
    setEditingFAQ(null);
    setDeleteFAQ(null);
    setFAQForm(emptyFAQForm);
    setActiveTab("faqs");
    scrollTo(faqFormRef);
  };

  const startEditFAQ = (faq: PublicFAQ) => {
    setEditingFAQ(faq);
    setDeleteFAQ(null);
    setFAQForm(toFAQForm(faq));
    setActiveTab("faqs");
    scrollTo(faqFormRef);
  };

  const saveFAQ = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const body = {
        question: faqForm.question.trim(),
        answer: faqForm.answer.trim(),
        category: toNullable(faqForm.category),
        order: Number(faqForm.order || 0),
        isActive: faqForm.isActive,
      };
      if (editingFAQ) {
        await apiRequest<PublicFAQ>(`/dashboard/faqs/${editingFAQ.id}`, {
          method: "PATCH",
          body,
        });
        setNotice("Đã cập nhật FAQ");
      } else {
        await apiRequest<PublicFAQ>("/dashboard/faqs", {
          method: "POST",
          body,
        });
        setNotice("Đã tạo FAQ");
      }
      setEditingFAQ(null);
      setFAQForm(emptyFAQForm);
      await loadFAQs();
      scrollTo(faqListRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được FAQ");
    } finally {
      setSaving(false);
    }
  };

  const toggleFAQ = async (faq: PublicFAQ) => {
    if (!canManage) return;
    setError("");
    setNotice("");
    try {
      await apiRequest<PublicFAQ>(`/dashboard/faqs/${faq.id}`, {
        method: "PATCH",
        body: { isActive: !faq.isActive },
      });
      setNotice(faq.isActive ? "Đã tắt FAQ" : "Đã bật FAQ");
      await loadFAQs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được FAQ");
    }
  };

  const confirmDeleteFAQ = async () => {
    if (!canWrite || !deleteFAQ) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<PublicFAQ>(`/dashboard/faqs/${deleteFAQ.id}`, { method: "DELETE" });
      setDeleteFAQ(null);
      setNotice("Đã xoá FAQ");
      await loadFAQs();
      scrollTo(faqListRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xoá được FAQ");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <section className="rounded-md border border-[#dce3ee] bg-white p-6">
        <p className="text-sm font-medium text-[#55708f]">Website</p>
        <h2 className="mt-1 text-2xl font-semibold">Cấu hình website</h2>
        <p className="mt-2 text-sm text-[#667892]">Module này chỉ dành cho ADMIN hoặc STAFF.</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
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

      <section className="rounded-md border border-[#dce3ee] bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#55708f]">Website</p>
            <h2 className="mt-1 text-2xl font-semibold">Cấu hình website</h2>
            <p className="mt-2 text-sm text-[#667892]">Quản lý thông tin hiển thị công khai, banner và FAQ trên website đặt lịch.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={startCreateBanner} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]">Tạo banner</button>
            <button type="button" onClick={startCreateFAQ} className="rounded-md bg-[#0d4f8b] px-3 py-2 text-sm font-semibold text-white hover:bg-[#083d6d]">Tạo FAQ</button>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${activeTab === tab.key ? "border-[#0d4f8b] bg-[#e7f0fb] text-[#0d4f8b]" : "border-[#dce3ee] text-[#42526b] hover:bg-[#f8fafc]"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? <section className="rounded-md border border-[#dce3ee] bg-white p-8 text-center text-sm text-[#667892]">Đang tải cấu hình website...</section> : null}

      {activeTab === "settings" ? (
        <section className="rounded-md border border-[#dce3ee] bg-white p-5">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Thông tin website</h3>
              <p className="mt-1 text-sm text-[#667892]">STAFF được xem, chỉ ADMIN được cập nhật cấu hình hiển thị công khai.</p>
            </div>
            <p className="text-xs text-[#8a98aa]">Cập nhật {siteRecord?.updatedAt ? new Date(siteRecord.updatedAt).toLocaleString("vi-VN") : "-"}</p>
          </div>
          <form className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]" onSubmit={saveSiteSettings}>
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-sm font-medium text-[#334155]">Tên bệnh viện</span><input disabled={!canWrite} value={siteForm.hospitalName || ""} onChange={(e) => setSiteForm((current) => ({ ...current, hospitalName: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f8fafc]" /></label>
                <label className="block"><span className="text-sm font-medium text-[#334155]">Email</span><input disabled={!canWrite} value={siteForm.email || ""} onChange={(e) => setSiteForm((current) => ({ ...current, email: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f8fafc]" /></label>
                <label className="block"><span className="text-sm font-medium text-[#334155]">Hotline</span><input disabled={!canWrite} value={siteForm.hotline || ""} onChange={(e) => setSiteForm((current) => ({ ...current, hotline: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f8fafc]" /></label>
                <label className="block"><span className="text-sm font-medium text-[#334155]">Hotline cấp cứu</span><input disabled={!canWrite} value={siteForm.emergencyHotline || ""} onChange={(e) => setSiteForm((current) => ({ ...current, emergencyHotline: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f8fafc]" /></label>
              </div>
              <label className="block"><span className="text-sm font-medium text-[#334155]">Địa chỉ</span><textarea disabled={!canWrite} value={siteForm.address || ""} onChange={(e) => setSiteForm((current) => ({ ...current, address: e.target.value }))} rows={2} className="mt-1 w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f8fafc]" /></label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-sm font-medium text-[#334155]">Giờ làm việc</span><textarea disabled={!canWrite} value={siteForm.workingHours || ""} onChange={(e) => setSiteForm((current) => ({ ...current, workingHours: e.target.value }))} rows={2} className="mt-1 w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f8fafc]" /></label>
                <label className="block"><span className="text-sm font-medium text-[#334155]">URL bản đồ</span><textarea disabled={!canWrite} value={siteForm.mapUrl || ""} onChange={(e) => setSiteForm((current) => ({ ...current, mapUrl: e.target.value }))} rows={2} className="mt-1 w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f8fafc]" /></label>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                {(["facebook", "zalo", "youtube", "tiktok"] as const).map((key) => (
                  <label key={key} className="block"><span className="text-sm font-medium capitalize text-[#334155]">{key}</span><input disabled={!canWrite} value={siteForm[key]} onChange={(e) => setSiteForm((current) => ({ ...current, [key]: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f8fafc]" /></label>
                ))}
              </div>
              {canWrite ? <button disabled={saving || Boolean(uploading)} className="rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60">{saving ? "Đang lưu..." : "Lưu thông tin website"}</button> : null}
            </div>
            <aside className="space-y-4">
              {(["logo", "favicon"] as const).map((key) => (
                <div key={key} className="rounded-md border border-[#e5ebf3] p-3">
                  <label className="block"><span className="text-sm font-medium text-[#334155]">{key === "logo" ? "Logo" : "Favicon"}</span><input disabled={!canWrite} value={siteForm[key] || ""} onChange={(e) => setSiteForm((current) => ({ ...current, [key]: e.target.value, [`${key}AssetId`]: "" }))} placeholder="https://..." className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f8fafc]" /></label>
                  <input disabled={!canWrite || uploading === key} type="file" accept="image/jpeg,image/png,image/webp,image/x-icon" onChange={(e) => void uploadToForm(e.target.files?.[0], "site-settings", key, (asset) => setSiteForm((current) => ({ ...current, [key]: asset.url, [`${key}AssetId`]: asset.id })))} className="mt-2 w-full rounded-md border border-dashed border-[#cfd8e6] bg-[#f8fafc] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0d4f8b] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:opacity-60" />
                  {uploading === key ? <p role="status" className="mt-2 text-xs font-medium text-[#0d4f8b]">Đang upload ảnh...</p> : null}
                  {siteForm[key] ? <div className="mt-3 rounded-md border border-[#e5ebf3] p-2"><img src={siteForm[key] || ""} alt={`Preview ${key}`} className="h-28 w-full rounded-md object-contain" /><p className="mt-2 truncate text-xs text-[#667892]">{siteForm[key]}</p></div> : null}
                </div>
              ))}
            </aside>
          </form>
        </section>
      ) : null}

      {activeTab === "banners" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section ref={bannerListRef} className="min-w-0 scroll-mt-24 rounded-md border border-[#dce3ee] bg-white">
            <div className="grid gap-3 border-b border-[#e5ebf3] p-4 md:grid-cols-[1fr_180px]">
              <input value={bannerPosition} onChange={(e) => setBannerPosition(e.target.value)} placeholder="Lọc vị trí, ví dụ HOME_HERO" list="banner-positions" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
              <select value={bannerActive} onChange={(e) => setBannerActive(e.target.value)} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"><option value="">Tất cả trạng thái</option><option value="true">Đang bật</option><option value="false">Đang tắt</option></select>
            </div>
            <datalist id="banner-positions">{positionOptions.map((position) => <option key={position} value={position} />)}</datalist>
            <div className="divide-y divide-[#eef2f7]">
              {banners.length ? banners.map((banner) => (
                <article key={banner.id} className="p-4">
                  <div className="grid gap-4 lg:grid-cols-[180px_1fr_auto]">
                    <div className="overflow-hidden rounded-md border border-[#e5ebf3] bg-[#f8fafc]"><img src={banner.image} alt={banner.title} className="h-28 w-full object-cover" /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{banner.title}</h3><span className={`rounded-md px-2 py-1 text-xs font-semibold ${banner.isActive ? "bg-[#e7f6ed] text-[#1f7a3a]" : "bg-[#eef2f7] text-[#667892]"}`}>{banner.isActive ? "Đang bật" : "Đang tắt"}</span></div>
                      <p className="mt-1 text-sm text-[#667892]">{banner.subtitle || "Không có mô tả phụ"}</p>
                      <p className="mt-2 text-xs text-[#8a98aa]">{banner.position} - thứ tự {banner.order}</p>
                      <p className="mt-1 truncate text-xs text-[#8a98aa]">{banner.linkUrl || "Chưa có link"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button type="button" onClick={() => startEditBanner(banner)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Sửa</button>
                      <button type="button" onClick={() => void toggleBanner(banner)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">{banner.isActive ? "Tắt" : "Bật"}</button>
                      {canWrite ? <button type="button" onClick={() => { setDeleteBanner(banner); scrollTo(bannerFormRef); }} className="rounded-md border border-[#f2b8b5] px-3 py-1.5 text-xs font-medium text-[#b3261e]">Xoá</button> : null}
                    </div>
                  </div>
                </article>
              )) : <p className="p-8 text-center text-sm text-[#667892]">Chưa có banner phù hợp.</p>}
            </div>
          </section>

          <aside ref={bannerFormRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5">
            {deleteBanner ? <div className="mb-5 rounded-md border border-[#f2b8b5] bg-[#fff3f2] p-4"><h3 className="font-semibold text-[#b3261e]">Xoá banner?</h3><p className="mt-2 text-sm text-[#5f2630]">{deleteBanner.title}</p><div className="mt-3 flex gap-2"><button type="button" disabled={saving} onClick={() => void confirmDeleteBanner()} className="rounded-md bg-[#b3261e] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Xoá</button><button type="button" onClick={() => setDeleteBanner(null)} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]">Huỷ</button></div></div> : null}
            <h3 className="text-lg font-semibold">{editingBanner ? "Cập nhật banner" : "Tạo banner"}</h3>
            <form className="mt-5 space-y-4" onSubmit={saveBanner}>
              <label className="block"><span className="text-sm font-medium text-[#334155]">Tiêu đề</span><input value={bannerForm.title} onChange={(e) => setBannerForm((current) => ({ ...current, title: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required /></label>
              <label className="block"><span className="text-sm font-medium text-[#334155]">Mô tả phụ</span><textarea value={bannerForm.subtitle} onChange={(e) => setBannerForm((current) => ({ ...current, subtitle: e.target.value }))} rows={2} className="mt-1 w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" /></label>
              {(["image", "mobileImage"] as const).map((key) => <div key={key}><label className="block"><span className="text-sm font-medium text-[#334155]">{key === "image" ? "Ảnh desktop" : "Ảnh mobile"}</span><input value={bannerForm[key]} onChange={(e) => setBannerForm((current) => ({ ...current, [key]: e.target.value, [`${key}AssetId`]: "" }))} placeholder="https://..." className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required={key === "image"} /></label><input disabled={uploading === key} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void uploadToForm(e.target.files?.[0], "banners", key, (asset) => setBannerForm((current) => ({ ...current, [key]: asset.url, [`${key}AssetId`]: asset.id })))} className="mt-2 w-full rounded-md border border-dashed border-[#cfd8e6] bg-[#f8fafc] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0d4f8b] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:opacity-60" />{uploading === key ? <p role="status" className="mt-2 text-xs font-medium text-[#0d4f8b]">Đang upload ảnh...</p> : null}{bannerForm[key] ? <div className="mt-2 rounded-md border border-[#e5ebf3] p-2"><img src={bannerForm[key]} alt={`Preview ${key}`} className="h-32 w-full rounded-md object-cover" /><p className="mt-2 truncate text-xs text-[#667892]">{bannerForm[key]}</p></div> : null}</div>)}
              <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="text-sm font-medium text-[#334155]">Vị trí</span><input value={bannerForm.position} onChange={(e) => setBannerForm((current) => ({ ...current, position: e.target.value }))} list="banner-positions" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required /></label><label className="block"><span className="text-sm font-medium text-[#334155]">Thứ tự</span><input value={bannerForm.order} onChange={(e) => setBannerForm((current) => ({ ...current, order: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" /></label></div>
              <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="text-sm font-medium text-[#334155]">Link</span><input value={bannerForm.linkUrl} onChange={(e) => setBannerForm((current) => ({ ...current, linkUrl: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" /></label><label className="block"><span className="text-sm font-medium text-[#334155]">Target</span><select value={bannerForm.target} onChange={(e) => setBannerForm((current) => ({ ...current, target: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"><option value="_self">Mở cùng tab</option><option value="_blank">Mở tab mới</option></select></label></div>
              <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="text-sm font-medium text-[#334155]">Bắt đầu</span><input type="datetime-local" value={bannerForm.startAt} onChange={(e) => setBannerForm((current) => ({ ...current, startAt: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" /></label><label className="block"><span className="text-sm font-medium text-[#334155]">Kết thúc</span><input type="datetime-local" value={bannerForm.endAt} onChange={(e) => setBannerForm((current) => ({ ...current, endAt: e.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" /></label></div>
              <label className="flex items-center justify-between rounded-md border border-[#e5ebf3] px-3 py-2"><span className="text-sm font-medium text-[#334155]">Đang bật</span><input type="checkbox" checked={bannerForm.isActive} onChange={(e) => setBannerForm((current) => ({ ...current, isActive: e.target.checked }))} className="h-4 w-4 accent-[#0d4f8b]" /></label>
              <div className="flex gap-2"><button disabled={saving || Boolean(uploading)} className="flex-1 rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60">{saving ? "Đang lưu..." : editingBanner ? "Lưu banner" : "Tạo banner"}</button>{editingBanner ? <button type="button" onClick={startCreateBanner} className="rounded-md border border-[#cfd8e6] px-4 py-2.5 text-sm font-medium text-[#42526b]">Huỷ</button> : null}</div>
            </form>
          </aside>
        </div>
      ) : null}

      {activeTab === "faqs" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section ref={faqListRef} className="min-w-0 scroll-mt-24 rounded-md border border-[#dce3ee] bg-white">
            <div className="grid gap-3 border-b border-[#e5ebf3] p-4 md:grid-cols-[1fr_180px]"><input value={faqCategory} onChange={(e) => setFAQCategory(e.target.value)} placeholder="Lọc category, ví dụ booking" list="faq-categories" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" /><select value={faqActive} onChange={(e) => setFAQActive(e.target.value)} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]"><option value="">Tất cả trạng thái</option><option value="true">Đang bật</option><option value="false">Đang tắt</option></select></div>
            <datalist id="faq-categories">{faqCategories.map((category) => <option key={category} value={category} />)}</datalist>
            <div className="divide-y divide-[#eef2f7]">{faqs.length ? faqs.map((faq) => <article key={faq.id} className="p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{faq.question}</h3><span className={`rounded-md px-2 py-1 text-xs font-semibold ${faq.isActive ? "bg-[#e7f6ed] text-[#1f7a3a]" : "bg-[#eef2f7] text-[#667892]"}`}>{faq.isActive ? "Đang bật" : "Đang tắt"}</span></div><p className="mt-2 text-sm text-[#667892]">{faq.answer}</p><p className="mt-2 text-xs text-[#8a98aa]">{faq.category || "general"} - thứ tự {faq.order}</p></div><div className="flex flex-wrap gap-2 lg:justify-end"><button type="button" onClick={() => startEditFAQ(faq)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Sửa</button><button type="button" onClick={() => void toggleFAQ(faq)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">{faq.isActive ? "Tắt" : "Bật"}</button>{canWrite ? <button type="button" onClick={() => { setDeleteFAQ(faq); scrollTo(faqFormRef); }} className="rounded-md border border-[#f2b8b5] px-3 py-1.5 text-xs font-medium text-[#b3261e]">Xoá</button> : null}</div></div></article>) : <p className="p-8 text-center text-sm text-[#667892]">Chưa có FAQ phù hợp.</p>}</div>
          </section>
          <aside ref={faqFormRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5">
            {deleteFAQ ? <div className="mb-5 rounded-md border border-[#f2b8b5] bg-[#fff3f2] p-4"><h3 className="font-semibold text-[#b3261e]">Xoá FAQ?</h3><p className="mt-2 text-sm text-[#5f2630]">{deleteFAQ.question}</p><div className="mt-3 flex gap-2"><button type="button" disabled={saving} onClick={() => void confirmDeleteFAQ()} className="rounded-md bg-[#b3261e] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Xoá</button><button type="button" onClick={() => setDeleteFAQ(null)} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]">Huỷ</button></div></div> : null}
            <h3 className="text-lg font-semibold">{editingFAQ ? "Cập nhật FAQ" : "Tạo FAQ"}</h3>
            <form className="mt-5 space-y-4" onSubmit={saveFAQ}><label className="block"><span className="text-sm font-medium text-[#334155]">Câu hỏi</span><textarea value={faqForm.question} onChange={(e) => setFAQForm((current) => ({ ...current, question: e.target.value }))} rows={3} className="mt-1 w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required /></label><label className="block"><span className="text-sm font-medium text-[#334155]">Câu trả lời</span><textarea value={faqForm.answer} onChange={(e) => setFAQForm((current) => ({ ...current, answer: e.target.value }))} rows={5} className="mt-1 w-full resize-none rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="text-sm font-medium text-[#334155]">Category</span><input value={faqForm.category} onChange={(e) => setFAQForm((current) => ({ ...current, category: e.target.value }))} list="faq-categories" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" /></label><label className="block"><span className="text-sm font-medium text-[#334155]">Thứ tự</span><input value={faqForm.order} onChange={(e) => setFAQForm((current) => ({ ...current, order: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" /></label></div><label className="flex items-center justify-between rounded-md border border-[#e5ebf3] px-3 py-2"><span className="text-sm font-medium text-[#334155]">Đang bật</span><input type="checkbox" checked={faqForm.isActive} onChange={(e) => setFAQForm((current) => ({ ...current, isActive: e.target.checked }))} className="h-4 w-4 accent-[#0d4f8b]" /></label><div className="flex gap-2"><button disabled={saving} className="flex-1 rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60">{saving ? "Đang lưu..." : editingFAQ ? "Lưu FAQ" : "Tạo FAQ"}</button>{editingFAQ ? <button type="button" onClick={startCreateFAQ} className="rounded-md border border-[#cfd8e6] px-4 py-2.5 text-sm font-medium text-[#42526b]">Huỷ</button> : null}</div></form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
