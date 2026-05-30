"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type {
  ChatbotFAQ,
  ChatbotLog,
  ChatbotOverview,
  ChatbotRuntimeValue,
  ChatbotSession,
  ChatbotSessionDetail,
  ChatbotSettings,
  ListResult,
  Pagination,
} from "@/lib/types";

type TabKey = "overview" | "faqs" | "sessions" | "logs" | "settings";

type FAQForm = {
  question: string;
  answer: string;
  keywords: string;
  isActive: boolean;
};

type SettingsForm = ChatbotRuntimeValue;

const emptyFaqForm: FAQForm = {
  question: "",
  answer: "",
  keywords: "",
  isActive: true,
};

const emptyPagination: Pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

const defaultSettings: SettingsForm = {
  aiEnabled: true,
  fallbackEnabled: true,
  faqEnabled: true,
  model: "gemini-2.5-flash",
  maxSuggestedActions: 3,
  sessionExpiresDays: 7,
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Tong quan" },
  { key: "faqs", label: "FAQ" },
  { key: "sessions", label: "Phien" },
  { key: "logs", label: "Log" },
  { key: "settings", label: "Cau hinh" },
];

const statusOptions = [
  { value: "", label: "Tat ca trang thai" },
  { value: "true", label: "Dang bat" },
  { value: "false", label: "Dang tat" },
];

const formatDateTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "-";

const parseKeywords = (value: string) =>
  Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));

const toFaqForm = (item: ChatbotFAQ): FAQForm => ({
  question: item.question,
  answer: item.answer,
  keywords: item.keywords.join(", "),
  isActive: item.isActive,
});

const summarizeJson = (value: unknown) => {
  if (!value) return "-";
  try {
    return JSON.stringify(value);
  } catch {
    return "-";
  }
};

export default function ChatbotPage() {
  const { user } = useAuth();
  const canView = user?.role === "ADMIN" || user?.role === "STAFF";
  const canAdmin = user?.role === "ADMIN";
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [overview, setOverview] = useState<ChatbotOverview | null>(null);
  const [settings, setSettings] = useState<ChatbotSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(defaultSettings);
  const [faqs, setFaqs] = useState<ChatbotFAQ[]>([]);
  const [faqPagination, setFaqPagination] = useState<Pagination>(emptyPagination);
  const [faqSearch, setFaqSearch] = useState("");
  const [faqStatus, setFaqStatus] = useState("");
  const [faqPage, setFaqPage] = useState(1);
  const [faqForm, setFaqForm] = useState<FAQForm>(emptyFaqForm);
  const [editingFaq, setEditingFaq] = useState<ChatbotFAQ | null>(null);
  const [deleteFaq, setDeleteFaq] = useState<ChatbotFAQ | null>(null);
  const [sessions, setSessions] = useState<ChatbotSession[]>([]);
  const [sessionPagination, setSessionPagination] = useState<Pagination>(emptyPagination);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionStatus, setSessionStatus] = useState("");
  const [sessionPage, setSessionPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState<ChatbotSessionDetail | null>(null);
  const [logs, setLogs] = useState<ChatbotLog[]>([]);
  const [logPagination, setLogPagination] = useState<Pagination>(emptyPagination);
  const [logSearch, setLogSearch] = useState("");
  const [logIntent, setLogIntent] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const formRef = useRef<HTMLElement | null>(null);
  const faqListRef = useRef<HTMLElement | null>(null);
  const sessionDetailRef = useRef<HTMLElement | null>(null);

  const faqQuery = useMemo(
    () => ({
      search: faqSearch.trim() || undefined,
      isActive: faqStatus || undefined,
      page: faqPage,
      limit: 20,
    }),
    [faqPage, faqSearch, faqStatus],
  );

  const sessionQuery = useMemo(
    () => ({
      search: sessionSearch.trim() || undefined,
      isActive: sessionStatus || undefined,
      page: sessionPage,
      limit: 20,
    }),
    [sessionPage, sessionSearch, sessionStatus],
  );

  const logQuery = useMemo(
    () => ({
      search: logSearch.trim() || undefined,
      intent: logIntent.trim() || undefined,
      page: logPage,
      limit: 20,
    }),
    [logIntent, logPage, logSearch],
  );

  const loadOverview = useCallback(async () => {
    if (!canView) return;
    const result = await apiRequest<ChatbotOverview>("/dashboard/chatbot/overview");
    setOverview(result);
  }, [canView]);

  const loadSettings = useCallback(async () => {
    if (!canView) return;
    const result = await apiRequest<ChatbotSettings>("/dashboard/chatbot/settings");
    setSettings(result);
    setSettingsForm(result.value);
  }, [canView]);

  const loadFaqs = useCallback(async () => {
    if (!canView) return;
    const result = await apiRequest<ListResult<ChatbotFAQ>>("/dashboard/chatbot/faqs", {
      query: faqQuery,
    });
    setFaqs(result.items);
    setFaqPagination(result.pagination);
  }, [canView, faqQuery]);

  const loadSessions = useCallback(async () => {
    if (!canView) return;
    const result = await apiRequest<ListResult<ChatbotSession>>("/dashboard/chatbot/sessions", {
      query: sessionQuery,
    });
    setSessions(result.items);
    setSessionPagination(result.pagination);
  }, [canView, sessionQuery]);

  const loadLogs = useCallback(async () => {
    if (!canView) return;
    const result = await apiRequest<ListResult<ChatbotLog>>("/dashboard/chatbot/logs", {
      query: logQuery,
    });
    setLogs(result.items);
    setLogPagination(result.pagination);
  }, [canView, logQuery]);

  const loadAll = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadOverview(), loadSettings(), loadFaqs(), loadSessions(), loadLogs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc du lieu chatbot");
    } finally {
      setLoading(false);
    }
  }, [canView, loadFaqs, loadLogs, loadOverview, loadSessions, loadSettings]);

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

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    window.setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const startCreateFaq = () => {
    setEditingFaq(null);
    setDeleteFaq(null);
    setFaqForm(emptyFaqForm);
    setActiveTab("faqs");
    setError("");
    setNotice("");
    scrollTo(formRef);
  };

  const startEditFaq = (item: ChatbotFAQ) => {
    setEditingFaq(item);
    setDeleteFaq(null);
    setFaqForm(toFaqForm(item));
    setActiveTab("faqs");
    setError("");
    setNotice("");
    scrollTo(formRef);
  };

  const saveFaq = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canView) return;
    const keywords = parseKeywords(faqForm.keywords);
    if (keywords.length === 0) {
      setError("Can nhap it nhat 1 tu khoa FAQ");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const body = {
        question: faqForm.question.trim(),
        answer: faqForm.answer.trim(),
        keywords,
        isActive: faqForm.isActive,
      };
      if (editingFaq) {
        await apiRequest<ChatbotFAQ>(`/dashboard/chatbot/faqs/${editingFaq.id}`, {
          method: "PATCH",
          body,
        });
        setNotice("Da cap nhat FAQ chatbot");
      } else {
        await apiRequest<ChatbotFAQ>("/dashboard/chatbot/faqs", {
          method: "POST",
          body,
        });
        setNotice("Da tao FAQ chatbot");
      }
      setEditingFaq(null);
      setFaqForm(emptyFaqForm);
      await loadFaqs();
      await loadOverview();
      scrollTo(faqListRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong luu duoc FAQ chatbot");
    } finally {
      setSaving(false);
    }
  };

  const toggleFaqStatus = async (item: ChatbotFAQ) => {
    if (!canView) return;
    setError("");
    setNotice("");
    try {
      await apiRequest<ChatbotFAQ>(`/dashboard/chatbot/faqs/${item.id}/status`, {
        method: "PATCH",
        body: { isActive: !item.isActive },
      });
      setNotice(item.isActive ? "Da tat FAQ chatbot" : "Da bat FAQ chatbot");
      await loadFaqs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong cap nhat duoc trang thai FAQ");
    }
  };

  const confirmDeleteFaq = async () => {
    if (!deleteFaq || !canAdmin) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<ChatbotFAQ>(`/dashboard/chatbot/faqs/${deleteFaq.id}`, {
        method: "DELETE",
      });
      setDeleteFaq(null);
      setNotice("Da xoa FAQ chatbot");
      await loadFaqs();
      scrollTo(faqListRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong xoa duoc FAQ chatbot");
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canAdmin) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<ChatbotSettings>("/dashboard/chatbot/settings", {
        method: "PATCH",
        body: settingsForm,
      });
      setSettings(result);
      setSettingsForm(result.value);
      setNotice("Da cap nhat cau hinh chatbot");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong cap nhat duoc cau hinh chatbot");
    } finally {
      setSaving(false);
    }
  };

  const openSession = async (item: ChatbotSession) => {
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<ChatbotSessionDetail>(`/dashboard/chatbot/sessions/${item.id}`);
      setSelectedSession(result);
      setActiveTab("sessions");
      scrollTo(sessionDetailRef);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc chi tiet phien");
    }
  };

  if (!canView) {
    return (
      <section className="rounded-md border border-[#dce3ee] bg-white p-6">
        <p className="text-sm font-medium text-[#55708f]">Tu dong hoa</p>
        <h2 className="mt-1 text-2xl font-semibold">Chatbot</h2>
        <p className="mt-2 text-sm text-[#667892]">Module chatbot chi danh cho ADMIN hoac STAFF.</p>
      </section>
    );
  }

  const maxIntent = Math.max(...(overview?.intents.map((item) => item.count) || [1]), 1);
  const maxState = Math.max(...(overview?.states.map((item) => item.count) || [1]), 1);

  return (
    <div className="space-y-6">
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

      <section className="rounded-md border border-[#dce3ee] bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#55708f]">Tu dong hoa</p>
            <h2 className="mt-1 text-2xl font-semibold">Chatbot</h2>
            <p className="mt-2 text-sm text-[#667892]">Theo doi hoi thoai, cau hinh AI/FAQ va quan ly bo cau hoi chatbot.</p>
          </div>
          <button onClick={startCreateFaq} className="rounded-md bg-[#0d4f8b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083d6d]">Tao FAQ</button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${activeTab === item.key ? "border-[#0d4f8b] bg-[#e7f0fb] text-[#0d4f8b]" : "border-[#dce3ee] text-[#42526b] hover:bg-[#f8fafc]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <section className="rounded-md border border-[#dce3ee] bg-white p-8 text-center text-sm text-[#667892]">Dang tai du lieu chatbot...</section>
      ) : null}

      {activeTab === "overview" && overview ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border border-[#dce3ee] bg-white p-5"><p className="text-sm text-[#667892]">Tong phien</p><p className="mt-2 text-3xl font-semibold">{overview.metrics.totalSessions}</p></div>
            <div className="rounded-md border border-[#dce3ee] bg-white p-5"><p className="text-sm text-[#667892]">Phien dang hoat dong</p><p className="mt-2 text-3xl font-semibold">{overview.metrics.activeSessions}</p></div>
            <div className="rounded-md border border-[#dce3ee] bg-white p-5"><p className="text-sm text-[#667892]">Tong tin nhan</p><p className="mt-2 text-3xl font-semibold">{overview.metrics.totalLogs}</p></div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-md border border-[#dce3ee] bg-white p-5">
              <h3 className="font-semibold">Intent pho bien</h3>
              <div className="mt-4 space-y-3">
                {overview.intents.length ? overview.intents.map((item) => (
                  <div key={item.intent || "none"}>
                    <div className="flex justify-between text-sm"><span>{item.intent || "Khong ro"}</span><span>{item.count}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-[#eef2f7]"><div className="h-2 rounded-full bg-[#0d4f8b]" style={{ width: `${Math.max((item.count / maxIntent) * 100, 6)}%` }} /></div>
                  </div>
                )) : <p className="text-sm text-[#667892]">Chua co intent.</p>}
              </div>
            </div>
            <div className="rounded-md border border-[#dce3ee] bg-white p-5">
              <h3 className="font-semibold">Trang thai hoi thoai</h3>
              <div className="mt-4 space-y-3">
                {overview.states.length ? overview.states.map((item) => (
                  <div key={item.state || "none"}>
                    <div className="flex justify-between text-sm"><span>{item.state || "Khong ro"}</span><span>{item.count}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-[#eef2f7]"><div className="h-2 rounded-full bg-[#2a7f62]" style={{ width: `${Math.max((item.count / maxState) * 100, 6)}%` }} /></div>
                  </div>
                )) : <p className="text-sm text-[#667892]">Chua co state.</p>}
              </div>
            </div>
          </section>

          <section className="rounded-md border border-[#dce3ee] bg-white p-5">
            <h3 className="font-semibold">Phien moi cap nhat</h3>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {overview.latestSessions.map((item) => (
                <button key={item.id} onClick={() => void openSession(item)} className="rounded-md border border-[#e5ebf3] p-4 text-left hover:border-[#0d4f8b]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{item.guestPhone || item.user?.phone || item.user?.fullName || "Khach"}</p>
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${item.isActive ? "bg-[#e7f6ed] text-[#1f7a3a]" : "bg-[#eef2f7] text-[#667892]"}`}>{item.isActive ? "Dang mo" : "Da dong"}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[#667892]">{item.lastMessage || "-"}</p>
                  <p className="mt-2 text-xs text-[#8a98aa]">{formatDateTime(item.updatedAt)}</p>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "faqs" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section ref={faqListRef} className="min-w-0 scroll-mt-24 rounded-md border border-[#dce3ee] bg-white">
            <div className="grid gap-3 border-b border-[#e5ebf3] p-4 md:grid-cols-[1fr_180px]">
              <input value={faqSearch} onChange={(event) => { setFaqSearch(event.target.value); setFaqPage(1); }} placeholder="Tim cau hoi, cau tra loi, tu khoa" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
              <select value={faqStatus} onChange={(event) => { setFaqStatus(event.target.value); setFaqPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
                {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div className="divide-y divide-[#eef2f7]">
              {faqs.length ? faqs.map((item) => (
                <article key={item.id} className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{item.question}</h3>
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${item.isActive ? "bg-[#e7f6ed] text-[#1f7a3a]" : "bg-[#eef2f7] text-[#667892]"}`}>{item.isActive ? "Dang bat" : "Dang tat"}</span>
                      </div>
                      <p className="mt-2 text-sm text-[#667892]">{item.answer}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.keywords.map((keyword) => <span key={keyword} className="rounded-md bg-[#f1f5f9] px-2 py-1 text-xs font-medium text-[#42526b]">{keyword}</span>)}
                      </div>
                      <p className="mt-3 text-xs text-[#8a98aa]">Cap nhat {formatDateTime(item.updatedAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button onClick={() => startEditFaq(item)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Sua</button>
                      <button onClick={() => void toggleFaqStatus(item)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">{item.isActive ? "Tat" : "Bat"}</button>
                      {canAdmin ? <button onClick={() => setDeleteFaq(item)} className="rounded-md border border-[#f2b8b5] px-3 py-1.5 text-xs font-medium text-[#b3261e]">Xoa</button> : null}
                    </div>
                  </div>
                </article>
              )) : <p className="p-8 text-center text-sm text-[#667892]">Chua co FAQ phu hop.</p>}
            </div>
            <div className="flex items-center justify-between border-t border-[#e5ebf3] px-4 py-3 text-sm text-[#667892]">
              <span>{faqPagination.total} ket qua, trang {faqPagination.page}/{faqPagination.totalPages || 1}</span>
              <div className="flex gap-2">
                <button disabled={faqPage <= 1} onClick={() => setFaqPage((current) => Math.max(current - 1, 1))} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Truoc</button>
                <button disabled={faqPage >= faqPagination.totalPages} onClick={() => setFaqPage((current) => current + 1)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Sau</button>
              </div>
            </div>
          </section>

          <aside ref={formRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5 xl:sticky xl:top-24 xl:self-start">
            {deleteFaq ? (
              <div className="mb-5 rounded-md border border-[#f2b8b5] bg-[#fff3f2] p-4">
                <h3 className="font-semibold text-[#b3261e]">Xac nhan xoa FAQ</h3>
                <p className="mt-2 text-sm text-[#5f2630]">{deleteFaq.question}</p>
                <div className="mt-3 flex gap-2">
                  <button disabled={saving} onClick={() => void confirmDeleteFaq()} className="rounded-md bg-[#b3261e] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Xoa</button>
                  <button onClick={() => setDeleteFaq(null)} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm font-medium text-[#42526b]">Huy</button>
                </div>
              </div>
            ) : null}
            <h3 className="text-lg font-semibold">{editingFaq ? "Cap nhat FAQ" : "Tao FAQ chatbot"}</h3>
            <form className="mt-5 space-y-4" onSubmit={saveFaq}>
              <label className="block"><span className="text-sm font-medium text-[#334155]">Cau hoi</span><textarea value={faqForm.question} onChange={(event) => setFaqForm((current) => ({ ...current, question: event.target.value }))} rows={3} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required /></label>
              <label className="block"><span className="text-sm font-medium text-[#334155]">Cau tra loi</span><textarea value={faqForm.answer} onChange={(event) => setFaqForm((current) => ({ ...current, answer: event.target.value }))} rows={5} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required /></label>
              <label className="block"><span className="text-sm font-medium text-[#334155]">Tu khoa</span><input value={faqForm.keywords} onChange={(event) => setFaqForm((current) => ({ ...current, keywords: event.target.value }))} placeholder="dat lich, kham, bac si" className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" required /><span className="mt-1 block text-xs text-[#667892]">Phan tach bang dau phay, toi da 20 tu khoa.</span></label>
              <label className="flex items-center justify-between rounded-md border border-[#e5ebf3] px-3 py-2"><span className="text-sm font-medium text-[#334155]">Dang bat</span><input type="checkbox" checked={faqForm.isActive} onChange={(event) => setFaqForm((current) => ({ ...current, isActive: event.target.checked }))} className="h-4 w-4 accent-[#0d4f8b]" /></label>
              <div className="flex gap-2">
                <button disabled={saving} className="flex-1 rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60">{saving ? "Dang luu..." : editingFaq ? "Luu thay doi" : "Tao FAQ"}</button>
                {editingFaq ? <button type="button" onClick={startCreateFaq} className="rounded-md border border-[#cfd8e6] px-4 py-2.5 text-sm font-medium text-[#42526b]">Huy</button> : null}
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {activeTab === "sessions" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="min-w-0 rounded-md border border-[#dce3ee] bg-white">
            <div className="grid gap-3 border-b border-[#e5ebf3] p-4 md:grid-cols-[1fr_180px]">
              <input value={sessionSearch} onChange={(event) => { setSessionSearch(event.target.value); setSessionPage(1); }} placeholder="Tim SÐT, tin nhan, phan hoi" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
              <select value={sessionStatus} onChange={(event) => { setSessionStatus(event.target.value); setSessionPage(1); }} className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]">
                {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
                <thead><tr className="text-[#667892]"><th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Khach</th><th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Intent / State</th><th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Tin gan nhat</th><th className="border-b border-[#e5ebf3] px-4 py-3 font-semibold">Log</th><th className="border-b border-[#e5ebf3] px-4 py-3 text-right font-semibold">Thao tac</th></tr></thead>
                <tbody>
                  {sessions.length ? sessions.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="border-b border-[#eef2f7] px-4 py-3"><p className="font-semibold">{item.guestPhone || item.user?.phone || "-"}</p><p className="mt-1 text-xs text-[#667892]">{item.user?.fullName || item.id}</p></td>
                      <td className="border-b border-[#eef2f7] px-4 py-3"><p>{item.currentIntent || "-"}</p><p className="mt-1 text-xs text-[#667892]">{item.currentState || "-"}</p></td>
                      <td className="border-b border-[#eef2f7] px-4 py-3"><p className="line-clamp-2">{item.lastMessage || "-"}</p><p className="mt-1 text-xs text-[#667892]">{formatDateTime(item.updatedAt)}</p></td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">{item._count.logs}</td>
                      <td className="border-b border-[#eef2f7] px-4 py-3 text-right"><button onClick={() => void openSession(item)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Chi tiet</button></td>
                    </tr>
                  )) : <tr><td colSpan={5} className="px-4 py-10 text-center text-[#667892]">Chua co phien phu hop</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[#e5ebf3] px-4 py-3 text-sm text-[#667892]">
              <span>{sessionPagination.total} ket qua, trang {sessionPagination.page}/{sessionPagination.totalPages || 1}</span>
              <div className="flex gap-2">
                <button disabled={sessionPage <= 1} onClick={() => setSessionPage((current) => Math.max(current - 1, 1))} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Truoc</button>
                <button disabled={sessionPage >= sessionPagination.totalPages} onClick={() => setSessionPage((current) => current + 1)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Sau</button>
              </div>
            </div>
          </section>
          <aside ref={sessionDetailRef} className="scroll-mt-24 rounded-md border border-[#dce3ee] bg-white p-5 xl:sticky xl:top-24 xl:self-start">
            <h3 className="text-lg font-semibold">Chi tiet phien</h3>
            {selectedSession ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-md border border-[#e5ebf3] p-3 text-sm"><p><span className="font-medium">Khach:</span> {selectedSession.guestPhone || selectedSession.user?.fullName || "-"}</p><p className="mt-1"><span className="font-medium">Trang thai:</span> {selectedSession.currentState || "-"}</p><p className="mt-1"><span className="font-medium">Het han:</span> {formatDateTime(selectedSession.expiresAt)}</p></div>
                <div><p className="text-sm font-semibold">Draft</p><pre className="mt-2 max-h-44 overflow-auto rounded-md bg-[#f8fafc] p-3 text-xs text-[#42526b]">{summarizeJson(selectedSession.draft)}</pre></div>
                <div className="space-y-3">
                  {selectedSession.logs.map((item) => (
                    <div key={item.id} className="rounded-md border border-[#e5ebf3] p-3 text-sm">
                      <p className="font-medium">{item.message}</p>
                      <p className="mt-2 text-[#667892]">{item.response}</p>
                      <p className="mt-2 text-xs text-[#8a98aa]">{item.intent || "-"} - {formatDateTime(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="mt-3 text-sm text-[#667892]">Chon mot phien de xem log va draft.</p>}
          </aside>
        </div>
      ) : null}

      {activeTab === "logs" ? (
        <section className="rounded-md border border-[#dce3ee] bg-white">
          <div className="grid gap-3 border-b border-[#e5ebf3] p-4 md:grid-cols-[1fr_220px]">
            <input value={logSearch} onChange={(event) => { setLogSearch(event.target.value); setLogPage(1); }} placeholder="Tim tin nhan, phan hoi, SÐT" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
            <input value={logIntent} onChange={(event) => { setLogIntent(event.target.value); setLogPage(1); }} placeholder="Loc intent" className="rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa]" />
          </div>
          <div className="divide-y divide-[#eef2f7]">
            {logs.length ? logs.map((item) => (
              <article key={item.id} className="p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{item.guestPhone || item.user?.phone || item.user?.fullName || "Khach"}</p>
                    <p className="mt-1 text-xs text-[#667892]">{item.intent || "Khong ro"} - {formatDateTime(item.createdAt)}</p>
                  </div>
                  <button onClick={() => { setSessionSearch(item.sessionId || ""); setActiveTab("sessions"); }} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b]">Tim phien</button>
                </div>
                <p className="mt-3 text-sm font-medium">{item.message}</p>
                <p className="mt-2 text-sm text-[#667892]">{item.response}</p>
              </article>
            )) : <p className="p-8 text-center text-sm text-[#667892]">Chua co log phu hop.</p>}
          </div>
          <div className="flex items-center justify-between border-t border-[#e5ebf3] px-4 py-3 text-sm text-[#667892]">
            <span>{logPagination.total} ket qua, trang {logPagination.page}/{logPagination.totalPages || 1}</span>
            <div className="flex gap-2">
              <button disabled={logPage <= 1} onClick={() => setLogPage((current) => Math.max(current - 1, 1))} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Truoc</button>
              <button disabled={logPage >= logPagination.totalPages} onClick={() => setLogPage((current) => current + 1)} className="rounded-md border border-[#cfd8e6] px-3 py-1.5 font-medium disabled:opacity-50">Sau</button>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "settings" ? (
        <section className="rounded-md border border-[#dce3ee] bg-white p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Cau hinh runtime</h3>
              <p className="mt-1 text-sm text-[#667892]">STAFF duoc xem, chi ADMIN duoc cap nhat cau hinh chatbot.</p>
            </div>
            <p className="text-xs text-[#8a98aa]">Cap nhat {formatDateTime(settings?.updatedAt)}</p>
          </div>
          <form className="mt-5 grid gap-4 lg:grid-cols-2" onSubmit={saveSettings}>
            <label className="flex items-center justify-between rounded-md border border-[#e5ebf3] px-3 py-2"><span className="text-sm font-medium text-[#334155]">Bat AI</span><input disabled={!canAdmin} type="checkbox" checked={settingsForm.aiEnabled} onChange={(event) => setSettingsForm((current) => ({ ...current, aiEnabled: event.target.checked }))} className="h-4 w-4 accent-[#0d4f8b] disabled:opacity-60" /></label>
            <label className="flex items-center justify-between rounded-md border border-[#e5ebf3] px-3 py-2"><span className="text-sm font-medium text-[#334155]">Bat FAQ</span><input disabled={!canAdmin} type="checkbox" checked={settingsForm.faqEnabled} onChange={(event) => setSettingsForm((current) => ({ ...current, faqEnabled: event.target.checked }))} className="h-4 w-4 accent-[#0d4f8b] disabled:opacity-60" /></label>
            <label className="flex items-center justify-between rounded-md border border-[#e5ebf3] px-3 py-2"><span className="text-sm font-medium text-[#334155]">Fallback khi loi AI</span><input disabled={!canAdmin} type="checkbox" checked={settingsForm.fallbackEnabled} onChange={(event) => setSettingsForm((current) => ({ ...current, fallbackEnabled: event.target.checked }))} className="h-4 w-4 accent-[#0d4f8b] disabled:opacity-60" /></label>
            <label className="block"><span className="text-sm font-medium text-[#334155]">Model</span><input disabled={!canAdmin} value={settingsForm.model} onChange={(event) => setSettingsForm((current) => ({ ...current, model: event.target.value }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f8fafc]" required /></label>
            <label className="block"><span className="text-sm font-medium text-[#334155]">So action goi y</span><input disabled={!canAdmin} type="number" min={1} max={6} value={settingsForm.maxSuggestedActions} onChange={(event) => setSettingsForm((current) => ({ ...current, maxSuggestedActions: Number(event.target.value) }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f8fafc]" /></label>
            <label className="block"><span className="text-sm font-medium text-[#334155]">Ngay het han phien</span><input disabled={!canAdmin} type="number" min={1} max={30} value={settingsForm.sessionExpiresDays} onChange={(event) => setSettingsForm((current) => ({ ...current, sessionExpiresDays: Number(event.target.value) }))} className="mt-1 w-full rounded-md border border-[#cfd8e6] px-3 py-2 text-sm outline-none focus:border-[#0d4f8b] focus:ring-2 focus:ring-[#cfe4fa] disabled:bg-[#f8fafc]" /></label>
            {canAdmin ? <div className="lg:col-span-2"><button disabled={saving} className="rounded-md bg-[#0d4f8b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#083d6d] disabled:opacity-60">{saving ? "Dang luu..." : "Luu cau hinh"}</button></div> : null}
          </form>
        </section>
      ) : null}
    </div>
  );
}
