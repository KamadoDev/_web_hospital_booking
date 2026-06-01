import { z } from "zod";

export const cleanupUnusedMediaAssetsSchema = z.object({
  olderThanHours: z
    .number()
    .int()
    .min(1, "olderThanHours phai lon hon hoac bang 1")
    .max(24 * 30, "olderThanHours khong duoc vuot qua 30 ngay")
    .default(24),
  limit: z
    .number()
    .int()
    .min(1, "limit phai lon hon hoac bang 1")
    .max(100, "limit khong duoc vuot qua 100")
    .default(50),
});
