import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bác sĩ",
  description: "Danh sách bác sĩ, chuyên khoa, phí khám và lịch khám trống để đặt lịch trực tuyến.",
  alternates: {
    canonical: "/doctors",
  },
};

export default function DoctorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
