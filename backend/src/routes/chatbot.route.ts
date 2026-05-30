import { Router } from "express";
import { sendChatbotMessageHandler } from "../controllers/chatbot.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { chatbotMessageSchema } from "../validations/chatbot.validation.js";

const router = Router();

router.post("/message", validate(chatbotMessageSchema), sendChatbotMessageHandler);

export default router;
