import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý chuyên khoa",
  description: "Tạo, chỉnh sửa, ẩn hiện và quản lý hình ảnh chuyên khoa.",
};

export default function DashboardDepartmentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
