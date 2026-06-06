"use client";

import { Bot, Loader2, MessageCircle, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ChatbotResultCards } from "@/components/ui/chatbot-result-cards";
import {
  buildBookingHref,
  getActionEventMessage,
  getActionEventRole,
  getActionInputPlaceholder,
  getActionLoadingText,
  getActionRenderKey,
  getFlowStatusText,
  type ChatWidgetMessage,
} from "@/lib/chatbot-ui";
import type {
  ChatBookingDraft,
  ChatbotMessageResponse,
  ChatbotSuggestedAction,
} from "@/lib/types";

type StoredChat = {
  sessionId?: string;
  draft?: ChatBookingDraft;
  messages?: ChatWidgetMessage[];
};

const storageKey = "hospital-dashboard-chatbot";

const defaultMessages: ChatWidgetMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Xin chào, tôi có thể hỗ trợ tra cứu lịch hẹn, bác sĩ, gói khám hoặc hướng dẫn đặt lịch.",
  },
];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const readStoredChat = (): StoredChat => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "{}") as StoredChat;
  } catch {
    return {};
  }
};

export function DashboardChatbotWidget() {
  const { user } = useAuth();
  const storedChat = useMemo(() => readStoredChat(), []);
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(storedChat.sessionId);
  const [draft, setDraft] = useState<ChatBookingDraft | undefined>(storedChat.draft);
  const [messages, setMessages] = useState<ChatWidgetMessage[]>(
    storedChat.messages?.length ? storedChat.messages : defaultMessages,
  );
  const [actions, setActions] = useState<ChatbotSuggestedAction[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingText, setLoadingText] = useState(getActionLoadingText());
  const [inputPlaceholder, setInputPlaceholder] = useState("Nhập câu hỏi...");
  const [flowStatus, setFlowStatus] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ sessionId, draft, messages }));
  }, [draft, messages, sessionId]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 0);
  }, [messages, open, sending, flowStatus]);

  const phone = useMemo(() => user?.phone || undefined, [user?.phone]);

  const handleActionSideEffect = (action: ChatbotSuggestedAction, nextDraft?: ChatBookingDraft) => {
    if (typeof window === "undefined") return;

    if (action.type === "LOOKUP_APPOINTMENT") {
      window.setTimeout(() => {
        window.location.href = "/appointments/lookup";
      }, 450);
      return;
    }

    if (action.type === "START_BOOKING") {
      window.setTimeout(() => {
        window.location.href = buildBookingHref(action, nextDraft || draft);
      }, 450);
      return;
    }

    if (action.type === "CONTACT_STAFF") {
      window.setTimeout(() => {
        window.location.href = "/#consultation";
      }, 450);
      return;
    }

    if (action.type === "CHANGE_DATE" || action.type === "CHANGE_DOCTOR") {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const sendMessage = async (content: string, action?: ChatbotSuggestedAction) => {
    const trimmed = content.trim();
    if (!trimmed || sending || sendingRef.current) return;

    sendingRef.current = true;

    setMessages((current) => [
      ...current,
      {
        id: createId(),
        role: action ? getActionEventRole(action) : "user",
        content: action ? getActionEventMessage(action) : trimmed,
      },
    ]);
    setActions([]);
    setMessage("");
    setInputPlaceholder(getActionInputPlaceholder(action));
    setLoadingText(getActionLoadingText(action));
    setError("");
    setSending(true);

    try {
      const result = await apiRequest<ChatbotMessageResponse>("/chatbot/message", {
        method: "POST",
        body: {
          sessionId,
          message: trimmed,
          phone,
          draft,
          action: action
            ? {
                type: action.type,
                label: action.label,
                payload: action.payload,
              }
            : undefined,
        },
      });

      setSessionId(result.sessionId);
      setDraft(result.draft);
      setFlowStatus(getFlowStatusText(result.state, result.nextStep));
      setActions(result.suggestedActions || []);
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: result.state === "EMERGENCY_CARE" ? "alert" : "assistant",
          content: result.reply,
          results: result.results || [],
        },
      ]);
      if (action) handleActionSideEffect(action, result.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được tin nhắn");
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: "Tôi chưa xử lý được yêu cầu này. Bạn thử lại sau một chút nhé.",
        },
      ]);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(message);
  };

  const resetChat = () => {
    setSessionId(undefined);
    setDraft(undefined);
    setMessages(defaultMessages);
    setActions([]);
    setMessage("");
    setFlowStatus("");
    setInputPlaceholder("Nhập câu hỏi...");
    setError("");
    window.localStorage.removeItem(storageKey);
  };

  return (
    <div className="fixed bottom-8 right-5 z-40 sm:right-6">
      {open ? (
        <section className="flex h-[min(680px,calc(100vh-7rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl ring-1 ring-[var(--primary-soft)]">
          <header className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[var(--primary)]">
                <Bot className="h-5 w-5" aria-hidden="true" />
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#22c55e] ring-2 ring-[var(--surface)]" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Trợ lý dashboard</h2>
                <p className="text-xs text-[var(--text-muted)]">Hỏi nhanh về đặt lịch, bác sĩ, gói khám</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetChat}
                className="rounded-md p-2 text-[var(--text-soft)] hover:bg-[var(--surface-soft)]"
                aria-label="Tạo cuộc trò chuyện mới"
                title="Tạo cuộc trò chuyện mới"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-[var(--text-soft)] hover:bg-[var(--surface-soft)]"
                aria-label="Đóng chatbot"
                title="Đóng chatbot"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          {flowStatus ? (
            <div className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-2 text-xs font-semibold text-[var(--primary)]">
              {flowStatus}
            </div>
          ) : null}

          <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--surface-muted)] px-4 py-4">
            {messages.map((item) => (
              <div
                key={item.id}
                className={`flex ${
                  item.role === "user" ? "justify-end" : item.role === "system" || item.role === "alert" ? "justify-center" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-md px-3 py-2 text-sm leading-6 ${
                    item.role === "user"
                      ? "bg-[var(--primary)] text-white"
                      : item.role === "system"
                        ? "rounded-full border border-[var(--border)] bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium text-[var(--primary)]"
                        : item.role === "alert"
                          ? "border border-[#f5c26b] bg-[#fff8e8] text-[#8a4b00]"
                          : "border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--foreground)]"
                  }`}
                >
                  {item.content}
                  {item.role === "assistant" ? (
                    <ChatbotResultCards
                      groups={item.results}
                      disabled={sending}
                      onAction={(slotAction) => void sendMessage(slotAction.label, slotAction)}
                    />
                  ) : null}
                </div>
              </div>
            ))}
            {sending ? (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                {loadingText}
              </div>
            ) : null}
            <div ref={scrollRef} />
          </div>

          <div className="border-t border-[var(--border-soft)] p-3">
            {actions.length ? (
              <div className="mb-3 flex gap-2 overflow-x-auto">
                {actions.map((action, index) => (
                  <button
                    key={getActionRenderKey(action, index)}
                    type="button"
                    disabled={sending}
                    onClick={() => void sendMessage(action.label, action)}
                    className="shrink-0 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-soft)] hover:bg-[var(--surface-soft)] disabled:opacity-60"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
            {error ? <p className="mb-2 text-xs text-[#b3261e]">{error}</p> : null}
            <form className="flex gap-2" onSubmit={submitMessage}>
              <input
                ref={inputRef}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={inputPlaceholder}
                className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
              />
              <button
                disabled={sending || !message.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Gửi
              </button>
            </form>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-[var(--primary-soft)]"
          aria-label="Mở chatbot"
          title="Mở chatbot"
        >
          <span className="absolute inset-0 rounded-full bg-[var(--primary)] opacity-25 motion-safe:animate-ping" aria-hidden="true" />
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[var(--primary)] shadow-md">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <MessageCircle className="relative h-5 w-5 transition group-hover:scale-110" aria-hidden="true" />
          <span className="relative">Chatbot</span>
        </button>
      )}
    </div>
  );
}
