"use client";

import { Bot, Loader2, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { ChatBookingDraft, ChatbotMessageResponse, ChatbotSuggestedAction } from "@/lib/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type StoredChat = {
  sessionId?: string;
  draft?: ChatBookingDraft;
  messages?: ChatMessage[];
};

const storageKey = "hospital-public-chatbot";

const defaultMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Xin chào, tôi có thể hỗ trợ đặt lịch, tra cứu bác sĩ, gói khám và giải đáp nhanh trước khi bạn đến bệnh viện.",
  },
];

const chatbotSuggestionMessages = [
  "Bạn muốn tìm bác sĩ phù hợp?",
  "Cần hỏi nhanh về gói khám?",
  "Muốn tra cứu hướng dẫn đặt lịch?",
  "Chưa rõ nên chọn chuyên khoa nào?",
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

export function PublicChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [draft, setDraft] = useState<ChatBookingDraft | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [actions, setActions] = useState<ChatbotSuggestedAction[]>([]);
  const [message, setMessage] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedChat = readStoredChat();
      if (storedChat.sessionId) setSessionId(storedChat.sessionId);
      if (storedChat.draft) setDraft(storedChat.draft);
      if (storedChat.messages?.length) setMessages(storedChat.messages);
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ sessionId, draft, messages }));
  }, [draft, hydrated, messages, sessionId]);

  useEffect(() => {
    if (!open) return;

    window.setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 0);
  }, [messages, open, sending]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSuggestionIndex((current) => (current + 1) % chatbotSuggestionMessages.length);
    }, 4600);

    return () => window.clearInterval(intervalId);
  }, []);

  const sendMessage = async (content: string, action?: ChatbotSuggestedAction) => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setMessages((current) => [
      ...current,
      {
        id: createId(),
        role: "user",
        content: trimmed,
      },
    ]);
    setMessage("");
    setError("");
    setSending(true);

    try {
      const result = await apiRequest<ChatbotMessageResponse>("/chatbot/message", {
        method: "POST",
        body: {
          sessionId,
          message: trimmed,
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
      setActions(result.suggestedActions || []);
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: result.reply,
        },
      ]);
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
    setError("");
    window.localStorage.removeItem(storageKey);
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 sm:bottom-24 sm:right-6">
      {open ? (
        <section className="flex h-[min(620px,calc(100vh-6rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border border-[#cfe0f3] bg-white shadow-2xl ring-1 ring-[#d8e9ff]">
          <header className="flex items-center justify-between border-b border-[#e5ebf3] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#e7f0fb] text-[#0d4f8b]">
                <Bot className="h-5 w-5" aria-hidden="true" />
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#22c55e] ring-2 ring-white" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-[#172033]">Trợ lý đặt lịch</h2>
                <p className="truncate text-xs text-[#667892]">Hỗ trợ nhanh trước khi đặt khám</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetChat}
                className="rounded-md p-2 text-[#667892] hover:bg-[#f1f5f9]"
                aria-label="Tạo cuộc trò chuyện mới"
                title="Tạo cuộc trò chuyện mới"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-[#667892] hover:bg-[#f1f5f9]"
                aria-label="Đóng chatbot"
                title="Đóng chatbot"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#f6f8fb] px-4 py-4">
            {messages.map((item) => (
              <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-md px-3 py-2 text-sm leading-6 ${
                    item.role === "user"
                      ? "bg-[#0d4f8b] text-white"
                      : "border border-[#dce3ee] bg-white text-[#172033]"
                  }`}
                >
                  {item.content}
                </div>
              </div>
            ))}
            {sending ? (
              <div className="flex items-center gap-2 text-xs text-[#667892]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Chatbot đang trả lời...
              </div>
            ) : null}
            <div ref={scrollRef} />
          </div>

          <div className="border-t border-[#e5ebf3] bg-white p-3">
            {actions.length ? (
              <div className="mb-3 flex gap-2 overflow-x-auto">
                {actions.map((action) => (
                  <button
                    key={`${action.type}-${action.label}`}
                    type="button"
                    onClick={() => void sendMessage(action.label, action)}
                    className="shrink-0 rounded-md border border-[#cfd8e6] px-3 py-1.5 text-xs font-medium text-[#42526b] hover:bg-[#f8fafc]"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
            {error ? <p className="mb-2 text-xs text-[#b3261e]">{error}</p> : null}
            <form className="flex gap-2" onSubmit={submitMessage}>
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Nhập câu hỏi..."
                className="min-w-0 flex-1 rounded-md border border-[#cfd8e6] bg-white px-3 py-2 text-sm text-[#172033] outline-none focus:border-[#0d4f8b]"
              />
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-[#0d4f8b] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Gửi
              </button>
            </form>
          </div>
        </section>
      ) : (
        <div className="flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ui-floating-callout ui-soft-glow hidden w-[min(15rem,calc(100vw-2rem))] rounded-md border border-[#cfe0f3] bg-white px-3 py-2 text-left text-xs font-medium leading-5 text-[#42526b] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#f8fafc] sm:block"
          >
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#0d4f8b]">Trợ lý</span>
            {chatbotSuggestionMessages[suggestionIndex]}
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0d4f8b] text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#083d6d] focus:outline-none focus:ring-4 focus:ring-[#cfe4fa]"
            aria-label="Mở trợ lý"
            title="Mở trợ lý"
          >
            <span className="absolute inset-0 rounded-full bg-[#0d4f8b] opacity-25 motion-safe:animate-ping" aria-hidden="true" />
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#0d4f8b] shadow-md">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <Bot className="relative h-6 w-6 transition group-hover:scale-110" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
