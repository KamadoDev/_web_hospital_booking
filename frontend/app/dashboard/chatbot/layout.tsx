import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý chatbot",
  description: "Cấu hình chatbot, kho câu hỏi tư vấn, phiên chat và lịch sử hội thoại.",
};

export default function DashboardChatbotLayout({ children }: { children: React.ReactNode }) {
  return children;
}
