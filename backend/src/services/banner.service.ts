import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

type BannerInput = {
  title?: string;
  subtitle?: string | null;
  image?: string;
  mobileImage?: string | null;
  linkUrl?: string | null;
  target?: string | null;
  position?: string;
  order?: number;
  isActive?: boolean;
  startAt?: string | null;
  endAt?: string | null;
};

const bannerSelect = {
  id: true,
  title: true,
  subtitle: true,
  image: true,
  mobileImage: true,
  linkUrl: true,
  target: true,
  position: true,
  order: true,
  isActive: true,
  startAt: true,
  endAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BannerSelect;

const parseDate = (value?: string | null) => (value ? new Date(value) : value);

class BannerService {
  async listPublic(query: { position?: string }) {
    const now = new Date();

    return prisma.banner.findMany({
      where: {
        position: query.position,
        isActive: true,
        OR: [{ startAt: null }, { startAt: { lte: now } }],
        AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
      },
      select: bannerSelect,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
  }

  async listDashboard(query: { position?: string; isActive?: boolean }) {
    return prisma.banner.findMany({
      where: {
        position: query.position,
        isActive: query.isActive,
      },
      select: bannerSelect,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
  }

  async getById(id: string) {
    const banner = await prisma.banner.findUnique({
      where: { id },
      select: bannerSelect,
    });

    if (!banner) {
      throw new AppError("Khong tim thay banner", 404);
    }

    return banner;
  }

  async create(input: Required<Pick<BannerInput, "title" | "image">> & BannerInput) {
    return prisma.banner.create({
      data: {
        title: input.title,
        subtitle: input.subtitle,
        image: input.image,
        mobileImage: input.mobileImage,
        linkUrl: input.linkUrl,
        target: input.target,
        position: input.position || "HOME_HERO",
        order: input.order || 0,
        isActive: input.isActive ?? true,
        startAt: parseDate(input.startAt),
        endAt: parseDate(input.endAt),
      },
      select: bannerSelect,
    });
  }

  async update(id: string, input: BannerInput) {
    await this.getById(id);

    return prisma.banner.update({
      where: { id },
      data: {
        title: input.title,
        subtitle: input.subtitle,
        image: input.image,
        mobileImage: input.mobileImage,
        linkUrl: input.linkUrl,
        target: input.target,
        position: input.position,
        order: input.order,
        isActive: input.isActive,
        startAt: parseDate(input.startAt),
        endAt: parseDate(input.endAt),
      },
      select: bannerSelect,
    });
  }

  async delete(id: string) {
    const banner = await this.getById(id);

    await prisma.banner.delete({
      where: { id },
    });

    return banner;
  }
}

export default new BannerService();
