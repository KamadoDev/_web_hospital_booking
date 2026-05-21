import type { Request, Response, NextFunction } from "express";
import MediaAssetService from "../services/mediaAsset.service.js";
import { AppError } from "../utils/appError.js";

const getUploadedFiles = (files: Request["files"]) => {
  if (!files) return [];
  if (Array.isArray(files)) return files;

  return Object.values(files).flat();
};

export const uploadImagesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.is("multipart/form-data")) {
      throw new AppError("Request upload phai la multipart/form-data", 400);
    }

    const files = getUploadedFiles(req.files);
    const folder = typeof req.body.folder === "string" ? req.body.folder : "";

    if (!files.length) {
      return res.status(400).json({
        success: false,
        message: "Chua chon file upload",
        debug:
          process.env.NODE_ENV === "production"
            ? undefined
            : {
                contentType: req.headers["content-type"],
                body: req.body,
                bodyKeys: Object.keys(req.body || {}),
                files: req.files,
              },
      });
    }

    const items = await MediaAssetService.uploadImages(
      files,
      folder,
      req.user?.userId,
    );

    return res.status(201).json({
      success: true,
      message: "Upload anh thanh cong",
      data: {
        items,
      },
    });
  } catch (error) {
    next(error);
  }
};
