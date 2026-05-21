import multer from "multer";
import { AppError } from "../utils/appError.js";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(new AppError("Chi ho tro anh JPG, PNG hoac WEBP", 400));
      return;
    }

    callback(null, true);
  },
}).any();
