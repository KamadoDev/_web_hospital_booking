import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yêu cầu tư vấn",
  description: "Quản lý yêu cầu tư vấn từ khách truy cập website.",
};

export default function DashboardConsultationRequestsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
