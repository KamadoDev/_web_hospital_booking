import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../config/prisma.js";

const SITE_SETTINGS_KEY = "public_site_settings";

const defaultSiteSettings = {
  hospitalName: "Hospital Booking",
  logo: null,
  favicon: null,
  hotline: null,
  emergencyHotline: null,
  email: null,
  address: null,
  workingHours: null,
  mapUrl: null,
  socialLinks: {},
};

type SiteSettingsInput = Partial<typeof defaultSiteSettings>;

const toPrismaJson = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

class SiteSettingsService {
  async get() {
    const setting = await prisma.siteSetting.upsert({
      where: { key: SITE_SETTINGS_KEY },
      update: {},
      create: {
        key: SITE_SETTINGS_KEY,
        value: toPrismaJson(defaultSiteSettings),
        description: "Public website display settings",
      },
    });

    return {
      ...setting,
      value: {
        ...defaultSiteSettings,
        ...(setting.value as Record<string, unknown>),
      },
    };
  }

  async update(input: SiteSettingsInput) {
    const current = await this.get();
    const nextValue = {
      ...(current.value as Record<string, unknown>),
      ...input,
    };

    return prisma.siteSetting.update({
      where: { key: SITE_SETTINGS_KEY },
      data: {
        value: toPrismaJson(nextValue),
      },
    });
  }
}

export default new SiteSettingsService();
