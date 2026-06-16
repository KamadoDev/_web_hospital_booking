import { Router } from "express";
import {
  getSearchSuggestionsHandler,
  trackSearchAnalyticsHandler,
} from "../controllers/searchAnalytics.controller.js";
import { publicSearchHandler } from "../controllers/search.controller.js";

const router = Router();

router.get("/", publicSearchHandler);
router.get("/suggestions", getSearchSuggestionsHandler);
router.post("/analytics", trackSearchAnalyticsHandler);

export default router;
