const vietnamTimeZone = "Asia/Ho_Chi_Minh";

export const formatVietnamDate = (value?: string | null) => {
  if (!value) return "";

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: vietnamTimeZone,
  }).format(date);
};

export const getVietnamDateInput = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: vietnamTimeZone,
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
};

export const getVietnamTimeInput = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: vietnamTimeZone,
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value || "";
  const minute = parts.find((part) => part.type === "minute")?.value || "";

  return `${hour}:${minute}`;
};

export const getVietnamYesterdayDateInput = () => {
  const now = new Date();
  now.setDate(now.getDate() - 1);

  return getVietnamDateInput(now);
};

export const isVietnamSlotStartInPast = (date: string, startTime: string) => {
  const today = getVietnamDateInput();
  const nowTime = getVietnamTimeInput();

  return date < today || (date === today && startTime <= nowTime);
};
