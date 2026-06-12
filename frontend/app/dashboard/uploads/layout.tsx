import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thư viện ảnh",
  description: "Quản lý ảnh đã upload, trạng thái sử dụng và dọn dẹp ảnh không dùng.",
};

export default function DashboardUploadsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
