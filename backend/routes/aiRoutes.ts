import express from "express";
import {
  generateTasksWithRequirement,
  responseToUser,
  chatWithMcp,
  createConversation,
  getConversation,
} from "../controllers/aiController.js";
import { protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  generateTasksSchema,
  chatSchema,
  conversationChatSchema, conversationCreateSchema, conversationParamsSchema, conversationQuerySchema,
} from "../validations/aiValidation.js";

const router = express.Router();
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.post(
  "/generate-tasks",
  protect,
  validate({ body: generateTasksSchema }),
  generateTasksWithRequirement,
);
router.post("/chat", protect, validate({ body: chatSchema }), responseToUser);
router.post("/chat-mcp", protect, validate({ body: conversationChatSchema }), chatWithMcp);

router.post("/conversations", protect, validate({ body: conversationCreateSchema }), createConversation);
router.get("/conversations/latest", protect, getConversation);
router.get("/conversations/:conversationId", protect, validate({ params: conversationParamsSchema, query: conversationQuerySchema }), getConversation);

export default router;
