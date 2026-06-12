import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gói khám",
  description: "Danh sách gói khám, chi phí dự kiến, hạng mục đi kèm và đặt lịch khám trực tuyến.",
  alternates: {
    canonical: "/packages",
  },
};

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
