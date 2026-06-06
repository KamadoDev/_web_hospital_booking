import { CalendarDays, Clock } from "lucide-react";
import { formatChatbotDate } from "@/lib/chatbot-ui";
import type { ChatbotResultGroup, ChatbotSuggestedAction } from "@/lib/types";

type ChatbotResultCardsProps = {
  groups?: ChatbotResultGroup[];
  disabled?: boolean;
  onAction: (action: ChatbotSuggestedAction) => void;
};

export function ChatbotResultCards({ groups, disabled, onAction }: ChatbotResultCardsProps) {
  if (!groups?.length) return null;

  return (
    <div className="mt-3 space-y-3">
      {groups.map((group, groupIndex) => {
        if (group.type !== "slots" || !group.items.length) return null;

        return (
          <section
            key={`${group.type}-${groupIndex}`}
            className="space-y-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface)] p-2"
          >
            <div className="px-1">
              <p className="text-xs font-semibold text-[var(--foreground)]">{group.title}</p>
              {group.description ? (
                <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-muted)]">{group.description}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              {group.items.map((item) => {
                if (item.type !== "slot") return null;

                const action: ChatbotSuggestedAction = {
                  type: "VIEW_AVAILABLE_SLOTS",
                  label: `${formatChatbotDate(item.date)} ${item.startTime}-${item.endTime}`,
                  payload: {
                    doctorId: item.doctorId,
                    date: item.date,
                    timeSlotId: item.id,
                  },
                };

                return (
                  <article
                    key={item.id}
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[var(--foreground)]">
                        {item.doctorName || "Bác sĩ phù hợp"}
                      </p>
                      {item.departmentName ? (
                        <p className="truncate text-[11px] text-[var(--text-muted)]">{item.departmentName}</p>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-soft)]">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatChatbotDate(item.date)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {item.startTime} - {item.endTime}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onAction(action)}
                      className="mt-2 w-full rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
                    >
                      Chọn khung giờ này
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
