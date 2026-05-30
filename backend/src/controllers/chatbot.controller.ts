import type { Request, Response, NextFunction } from "express";
import ChatbotService from "../services/chatbot/chatbot.service.js";

export const sendChatbotMessageHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await ChatbotService.handleMessage(req.body);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
