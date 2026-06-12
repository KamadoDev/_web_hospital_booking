import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hướng dẫn đặt lịch",
  description: "Hướng dẫn các bước đặt lịch khám trực tuyến, xác thực OTP và theo dõi lịch hẹn.",
  alternates: {
    canonical: "/guide/booking",
  },
};

export default function BookingGuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
