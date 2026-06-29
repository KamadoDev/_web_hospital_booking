import { foldVietnamese, hasPhrase } from "./text-normalizer.js";

const emergencyKeywords = [
  "dau nguc du doi",
  "kho tho nang",
  "ngat",
  "co giat",
  "yeu liet",
  "liet nua nguoi",
  "chay mau nhieu",
  "dau dau du doi",
  "dau dau dot ngot",
];

export const hasEmergencySignal = (normalizedMessage: string) => {
  const foldedMessage = foldVietnamese(normalizedMessage);

  return emergencyKeywords.some((keyword) => hasPhrase(foldedMessage, keyword));
};
