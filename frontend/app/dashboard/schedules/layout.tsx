import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lịch bác sĩ",
  description: "Quản lý lịch làm việc, sinh slot khám và trạng thái khung giờ bác sĩ.",
};

export default function DashboardSchedulesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
