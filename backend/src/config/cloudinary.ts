import { v2 as cloudinary } from "cloudinary";

if (!process.env.CLOUDINARY_URL) {
  throw new Error("CLOUDINARY_URL is missing");
}

cloudinary.config({
  secure: true,
});

export { cloudinary };
