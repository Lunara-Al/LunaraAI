import { Router } from "express";
import { insertContactMessageSchema } from "@shared/schema";
import { storage } from "../storage";

export function createContactRouter(): Router {
  const router = Router();

  router.post("/send-message", async (req, res) => {
    try {
      const validation = insertContactMessageSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        });
      }

      const message = await storage.createContactMessage(validation.data);
      console.log("Contact message received:", message);
      
      return res.status(201).json({
        success: true,
        id: message.id,
        message: "Thank you for your message. We'll get back to you soon.",
      });
    } catch (error: any) {
      return res.status(500).json({
        message: "Failed to send message",
        error: error.message,
      });
    }
  });

  return router;
}
