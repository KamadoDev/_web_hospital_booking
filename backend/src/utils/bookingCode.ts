import { randomInt } from "crypto";

export const generateBookingCode = () => {
  const now = new Date();
  const date = [
    now.getUTCFullYear(),
    (now.getUTCMonth() + 1).toString().padStart(2, "0"),
    now.getUTCDate().toString().padStart(2, "0"),
  ].join("");

  return `BK${date}${randomInt(100000, 1000000)}`;
};
