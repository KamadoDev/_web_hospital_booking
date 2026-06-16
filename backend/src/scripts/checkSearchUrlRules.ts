import assert from "node:assert/strict";
import { resolveSupportSearchUrl } from "../services/search/search.urls.js";

const cases = [
  {
    name: "Quên mã lịch",
    input: { title: "Quên mã lịch", description: "Tra cứu lịch hẹn bằng số điện thoại" },
    expected: "/appointments/lookup",
  },
  {
    name: "Hủy lịch",
    input: { title: "Tôi muốn hủy lịch", keywords: ["huy lich", "ma lich"] },
    expected: "/appointments/lookup",
  },
  {
    name: "Thanh toán",
    input: { title: "Cách thanh toán hóa đơn", description: "Hỗ trợ hoàn tiền" },
    expected: "/faqs?category=payment",
  },
  {
    name: "BHYT",
    input: { title: "Khám có BHYT không?", description: "Bảo hiểm y tế" },
    expected: "/faqs?category=insurance",
  },
  {
    name: "Đặt lịch",
    input: { title: "Làm sao để đặt lịch khám?", description: "Chọn bác sĩ và khung giờ" },
    expected: "/#booking",
  },
  {
    name: "Fallback",
    input: { title: "Thông tin chung", fallback: "/faqs" },
    expected: "/faqs",
  },
];

for (const item of cases) {
  const actual = resolveSupportSearchUrl(item.input);
  assert.equal(actual, item.expected, `${item.name}: expected ${item.expected}, got ${actual}`);
}

console.table(cases.map((item) => ({
  case: item.name,
  url: item.expected,
})));
