import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý gói khám",
  description: "Tạo gói khám, hạng mục, chi phí và cấu hình hiển thị trên website.",
};

export default function DashboardPackagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
