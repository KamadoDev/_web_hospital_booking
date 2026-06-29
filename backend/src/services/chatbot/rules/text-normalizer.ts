const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const normalizeMessage = (message: string) =>
  message.trim().replace(/\s+/g, " ").toLowerCase();

export const foldVietnamese = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

export const hasPhrase = (foldedMessage: string, foldedPhrase: string) => {
  if (!foldedPhrase) return false;

  if (foldedPhrase.length <= 3) {
    return new RegExp(
      `(^|[^a-z0-9])${escapeRegExp(foldedPhrase)}([^a-z0-9]|$)`,
    ).test(foldedMessage);
  }

  return foldedMessage.includes(foldedPhrase);
};
