import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, "Ten chuyen khoa toi thieu 2 ky tu"),
  slug: z.string().trim().min(2, "Slug toi thieu 2 ky tu").optional(),
  description: z.string().trim().nullable().optional(),
  image: z.string().trim().url("Image phai la URL hop le").nullable().optional(),
  imageAssetId: z.string().uuid("Anh khong hop le").optional(),
  isActive: z.boolean().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(2, "Ten chuyen khoa toi thieu 2 ky tu").optional(),
  slug: z.string().trim().min(2, "Slug toi thieu 2 ky tu").nullable().optional(),
  description: z.string().trim().nullable().optional(),
  image: z.string().trim().url("Image phai la URL hop le").nullable().optional(),
  imageAssetId: z.string().uuid("Anh khong hop le").nullable().optional(),
  isActive: z.boolean().optional(),
});
