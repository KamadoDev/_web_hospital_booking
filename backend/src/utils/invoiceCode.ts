import { randomInt } from "crypto";

const buildDatePart = () => {
  const now = new Date();

  return [
    now.getUTCFullYear(),
    (now.getUTCMonth() + 1).toString().padStart(2, "0"),
    now.getUTCDate().toString().padStart(2, "0"),
  ].join("");
};

export const generateInvoiceCode = () =>
  `INV${buildDatePart()}${randomInt(100000, 1000000)}`;

export const generateInvoiceBarcode = () =>
  `BC${buildDatePart()}${randomInt(100000000, 1000000000)}`;
