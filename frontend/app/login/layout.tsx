import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị",
  description: "Đăng nhập dashboard quản trị hệ thống đặt lịch khám bằng OTP bảo mật.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
