export const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d");

const hasAny = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

export const resolveSupportSearchUrl = (input: {
  title?: string | null;
  description?: string | null;
  keywords?: string[];
  fallback?: string;
}) => {
  const haystack = normalizeSearchText([
    input.title || "",
    input.description || "",
    ...(input.keywords || []),
  ].join(" "));

  if (
    hasAny(haystack, [
      "quen ma",
      "ma lich",
      "tra cuu lich",
      "tim lich",
      "lich gan day",
      "huy lich",
      "doi lich",
      "xac thuc lai",
      "otp lai",
    ])
  ) {
    return "/appointments/lookup";
  }

  if (
    hasAny(haystack, [
      "thanh toan",
      "hoa don",
      "hoan tien",
      "payment",
      "invoice",
      "refund",
    ])
  ) {
    return "/faqs?category=payment";
  }

  if (hasAny(haystack, ["bhyt", "bao hiem", "insurance"])) {
    return "/faqs?category=insurance";
  }

  if (
    hasAny(haystack, [
      "dat lich",
      "chon lich",
      "lich kham",
      "khung gio",
      "booking",
    ])
  ) {
    return "/#booking";
  }

  return input.fallback || "/#booking";
};
