import { UploadApiResponse } from "cloudinary";
import { Prisma } from "../../generated/prisma/client.js";
import type { MediaOwnerType } from "../../generated/prisma/enums.js";
import { cloudinary } from "../config/cloudinary.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

type UploadFolder = "departments" | "users" | "doctors" | "packages" | "medical-results";

const folderMap: Record<UploadFolder, string> = {
  departments: "hospital/departments",
  users: "hospital/users",
  doctors: "hospital/doctors",
  packages: "hospital/packages",
  "medical-results": "hospital/medical-results",
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

const uploadBufferToCloudinary = (
  file: Express.Multer.File,
  folder: string,
) =>
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
  async uploadImages(files: Express.Multer.File[], folder: string, uploadedById?: string) {
    if (!files.length) {
      throw new AppError("Chua chon file upload", 400);
    }

    if (!isUploadFolder(folder)) {
      throw new AppError("Folder upload khong hop le", 400);
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

  async attachAsset(assetId: string, ownerType: MediaOwnerType, ownerId: string) {
    const asset = await prisma.mediaAsset.findUnique({
      where: {
        id: assetId,
      },
      select: mediaAssetSelect,
    });

    if (!asset) {
      throw new AppError("Khong tim thay anh da upload", 404);
    }

    if (asset.isUsed && (asset.ownerType !== ownerType || asset.ownerId !== ownerId)) {
      throw new AppError("Anh nay da duoc su dung", 409);
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
      throw new AppError("Khong tim thay anh da upload", 404);
    }

    if (asset.isUsed) {
      throw new AppError("Anh nay da duoc su dung", 409);
    }

    return asset;
  }

  async detachOwnerAssets(ownerType: MediaOwnerType, ownerId: string, exceptAssetId?: string) {
    return prisma.mediaAsset.updateMany({
      where: {
        ownerType,
        ownerId,
        ...(exceptAssetId ? { id: { not: exceptAssetId } } : {}),
      },
      data: {
        isUsed: false,
        ownerType: null,
        ownerId: null,
      },
    });
  }
}

export default new MediaAssetService();
