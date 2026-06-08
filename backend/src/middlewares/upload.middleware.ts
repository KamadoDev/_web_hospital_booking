import multer from "multer";
import { AppError } from "../utils/appError.js";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError("Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF, SVG hoặc ICO", 400));
      return;
    }

    callback(null, true);
  },
}).any();
