import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nhân sự",
  description: "Quản lý tài khoản quản trị, nhân viên, bác sĩ, vai trò và mật khẩu.",
};

export default function DashboardUsersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
