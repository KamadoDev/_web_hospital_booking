import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý bác sĩ",
  description: "Quản lý hồ sơ bác sĩ, chuyên khoa, phí khám và trạng thái nhận lịch.",
};

export default function DashboardDoctorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
