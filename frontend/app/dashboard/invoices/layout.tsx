import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý hóa đơn",
  description: "Tạo hóa đơn, ghi nhận thanh toán, hủy, hoàn tiền và theo dõi công nợ.",
};

export default function DashboardInvoicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
