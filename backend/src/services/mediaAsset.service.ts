import { UploadApiResponse } from "cloudinary";
import { Prisma } from "../../generated/prisma/client.js";
import type { MediaOwnerType } from "../../generated/prisma/enums.js";
import { cloudinary } from "../config/cloudinary.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

type UploadFolder =
  | "departments"
  | "users"
  | "doctors"
  | "packages"
  | "medical-results"
  | "site-settings"
  | "banners";

const folderMap: Record<UploadFolder, string> = {
  departments: "hospital/departments",
  users: "hospital/users",
  doctors: "hospital/doctors",
  packages: "hospital/packages",
  "medical-results": "hospital/medical-results",
  "site-settings": "hospital/site-settings",
  banners: "hospital/banners",
};

const mediaAssetSelect = {
  id: true,
  url: true,
  publicId: true,
  folder: true,
  mimeType: true,
  format: true,
  bytes: true,
  width: true,
  height: true,
  ownerType: true,
  ownerId: true,
  isUsed: true,
  uploadedById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MediaAssetSelect;

const isUploadFolder = (folder: string): folder is UploadFolder =>
  Object.keys(folderMap).includes(folder);

const uploadBufferToCloudinary = (file: Express.Multer.File, folder: string) =>
  new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { width: 1600, height: 1600, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Upload Cloudinary failed"));
          return;
        }

        resolve(result);
      },
    );

    stream.end(file.buffer);
  });

class MediaAssetService {
  async list(query: {
    isUsed?: boolean;
    folder?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.MediaAssetWhereInput = {
      isUsed: query.isUsed,
      folder: query.folder,
    };

    const [items, total] = await prisma.$transaction([
      prisma.mediaAsset.findMany({
        where,
        select: mediaAssetSelect,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async uploadImages(
    files: Express.Multer.File[],
    folder: string,
    uploadedById?: string,
  ) {
    if (!files.length) {
      throw new AppError("Chưa chọn file upload", 400);
    }

    if (!isUploadFolder(folder)) {
      throw new AppError("Folder upload không hợp lệ", 400);
    }

    const cloudinaryFolder = folderMap[folder];

    const uploadedItems = await Promise.all(
      files.map(async (file) => {
        const result = await uploadBufferToCloudinary(file, cloudinaryFolder);

        return prisma.mediaAsset.create({
          data: {
            url: result.secure_url,
            publicId: result.public_id,
            folder: cloudinaryFolder,
            mimeType: file.mimetype,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
            uploadedById,
          },
          select: mediaAssetSelect,
        });
      }),
    );

    return uploadedItems;
  }

  async attachAsset(
    assetId: string,
    ownerType: MediaOwnerType,
    ownerId: string,
  ) {
    const asset = await prisma.mediaAsset.findUnique({
      where: {
        id: assetId,
      },
      select: mediaAssetSelect,
    });

    if (!asset) {
      throw new AppError("Không tìm thấy ảnh đã upload", 404);
    }

    if (
      asset.isUsed &&
      (asset.ownerType !== ownerType || asset.ownerId !== ownerId)
    ) {
      throw new AppError("Ảnh này đã được sử dụng", 409);
    }

    return prisma.mediaAsset.update({
      where: {
        id: assetId,
      },
      data: {
        isUsed: true,
        ownerType,
        ownerId,
      },
      select: mediaAssetSelect,
    });
  }

  async getUsableAsset(assetId: string) {
    const asset = await prisma.mediaAsset.findUnique({
      where: {
        id: assetId,
      },
      select: mediaAssetSelect,
    });

    if (!asset) {
      throw new AppError("Không tìm thấy ảnh đã upload", 404);
    }

    if (asset.isUsed) {
      throw new AppError("Ảnh này đã được sử dụng", 409);
    }

    return asset;
  }

  async detachOwnerAssets(
    ownerType: MediaOwnerType,
    ownerId: string,
    exceptAssetId?: string | string[],
  ) {
    const exceptAssetIds = Array.isArray(exceptAssetId)
      ? exceptAssetId.filter(Boolean)
      : exceptAssetId
        ? [exceptAssetId]
        : [];

    return prisma.mediaAsset.updateMany({
      where: {
        ownerType,
        ownerId,
        ...(exceptAssetIds.length ? { id: { notIn: exceptAssetIds } } : {}),
      },
      data: {
        isUsed: false,
        ownerType: null,
        ownerId: null,
      },
    });
  }

  async detachOwnerAssetByUrl(
    ownerType: MediaOwnerType,
    ownerId: string,
    url?: string | null,
  ) {
    if (!url) return { count: 0 };

    return prisma.mediaAsset.updateMany({
      where: {
        ownerType,
        ownerId,
        url,
      },
      data: {
        isUsed: false,
        ownerType: null,
        ownerId: null,
      },
    });
  }

  async deleteUnused(id: string) {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      select: mediaAssetSelect,
    });

    if (!asset) {
      throw new AppError("Không tìm thấy ảnh", 404);
    }

    if (asset.isUsed) {
      throw new AppError("Không thể xóa ảnh đang được sử dụng", 409);
    }

    await cloudinary.uploader.destroy(asset.publicId, {
      resource_type: "image",
    });

    await prisma.mediaAsset.delete({
      where: { id },
    });

    return asset;
  }

  async cleanupUnused(input: { olderThanHours?: number; limit?: number }) {
    const olderThanHours = Math.max(input.olderThanHours || 24, 1);
    const limit = Math.min(Math.max(input.limit || 50, 1), 100);
    const olderThan = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const candidates = await prisma.mediaAsset.findMany({
      where: {
        isUsed: false,
        createdAt: {
          lt: olderThan,
        },
      },
      select: mediaAssetSelect,
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
    });

    const deleted: typeof candidates = [];
    const failed: { id: string; publicId: string; message: string }[] = [];

    for (const asset of candidates) {
      try {
        await cloudinary.uploader.destroy(asset.publicId, {
          resource_type: "image",
        });

        await prisma.mediaAsset.delete({
          where: { id: asset.id },
        });

        deleted.push(asset);
      } catch (error) {
        failed.push({
          id: asset.id,
          publicId: asset.publicId,
          message: error instanceof Error ? error.message : "Xóa ảnh thất bại",
        });
      }
    }

    return {
      olderThan,
      scanned: candidates.length,
      deletedCount: deleted.length,
      failedCount: failed.length,
      deleted,
      failed,
    };
  }
}

export default new MediaAssetService();
