import { Router } from "express";
import {
  getPublicChatbotSettingsHandler,
  sendChatbotMessageHandler,
} from "../controllers/chatbot.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { chatbotMessageSchema } from "../validations/chatbot.validation.js";

const router = Router();

router.get("/settings", getPublicChatbotSettingsHandler);
router.post("/message", validate(chatbotMessageSchema), sendChatbotMessageHandler);

export default router;
