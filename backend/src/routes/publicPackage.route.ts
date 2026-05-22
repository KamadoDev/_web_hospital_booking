import { Router } from "express";
import {
  getPublicPackageHandler,
  listPublicPackagesHandler,
} from "../controllers/package.controller.js";

const router = Router();

router.get("/", listPublicPackagesHandler);
router.get("/:slug", getPublicPackageHandler);

export default router;
