import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chuyên khoa",
  description: "Danh sách chuyên khoa, thông tin dịch vụ khám và đặt lịch theo chuyên khoa.",
  alternates: {
    canonical: "/departments",
  },
};

export default function DepartmentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
