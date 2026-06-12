import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đơn thuốc",
  description: "Tạo, chỉnh sửa, phát hành và hủy đơn thuốc từ hồ sơ khám.",
};

export default function DashboardPrescriptionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
