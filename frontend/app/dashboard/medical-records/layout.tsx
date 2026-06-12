import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hồ sơ khám",
  description: "Quản lý hồ sơ khám, kết quả lâm sàng, chẩn đoán và công bố kết quả.",
};

export default function DashboardMedicalRecordsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
