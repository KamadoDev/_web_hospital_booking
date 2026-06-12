import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý lịch hẹn",
  description: "Theo dõi, xác nhận, check-in và cập nhật trạng thái lịch hẹn khám.",
};

export default function DashboardAppointmentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
