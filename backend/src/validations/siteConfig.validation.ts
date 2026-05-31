import { z } from "zod";

const optionalText = (max = 500) => z.string().trim().max(max).nullable().optional();

export const updateSiteSettingsSchema = z.object({
  hospitalName: optionalText(120),
  logo: optionalText(1000),
  favicon: optionalText(1000),
  hotline: optionalText(50),
  emergencyHotline: optionalText(50),
  email: optionalText(120),
  address: optionalText(500),
  workingHours: optionalText(500),
  mapUrl: optionalText(1000),
  socialLinks: z.record(z.string(), z.string().trim().max(1000)).optional(),
});

export const createBannerSchema = z.object({
  title: z.string("Tieu de banner la bat buoc").trim().min(1, "Tieu de banner la bat buoc").max(160),
  subtitle: optionalText(500),
  image: z.string("Anh banner la bat buoc").trim().min(1, "Anh banner la bat buoc").max(1000),
  mobileImage: optionalText(1000),
  linkUrl: optionalText(1000),
  target: optionalText(50),
  position: z.string().trim().min(1).max(80).default("HOME_HERO"),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  startAt: z.string().datetime().nullable().optional(),
  endAt: z.string().datetime().nullable().optional(),
});

export const updateBannerSchema = createBannerSchema.partial();

export const createPublicFAQSchema = z.object({
  question: z.string("Cau hoi la bat buoc").trim().min(1, "Cau hoi la bat buoc").max(500),
  answer: z.string("Cau tra loi la bat buoc").trim().min(1, "Cau tra loi la bat buoc").max(3000),
  category: optionalText(120),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updatePublicFAQSchema = createPublicFAQSchema.partial();
