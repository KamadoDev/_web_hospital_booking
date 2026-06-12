import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cấu hình website",
  description: "Cập nhật thông tin website, logo, favicon, banner, FAQ và liên kết xã hội.",
};

export default function DashboardSiteSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
