import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tra cứu lịch hẹn",
  description: "Tra cứu mã lịch hẹn, xác thực OTP, theo dõi trạng thái khám, kết quả và thanh toán.",
  alternates: {
    canonical: "/appointments/lookup",
  },
};

export default function AppointmentLookupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
