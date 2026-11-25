import attachmentRoutes from "./attachmentRoutes.js";
import skillRoutes from "./skillRoutes.js";
import express from "express";
import {
  generateTasksWithRequirement,
  responseToUser,
  chatWithMcp,
  createConversation,
  getConversation,
  listConversations,
  getConversationCapabilities,
  updateConversationContext,
} from "../controllers/aiController.js";
import {
  startChatTurn,
  getChatTurn,
  streamChatEvents,
  cancelChatTurn,
} from "../controllers/chatStreamController.js";
import { handleProposalAction } from "../controllers/A2UI/taskProposalController.js";
import { protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  generateTasksSchema,
  chatSchema,
  conversationChatSchema,
  conversationCreateSchema,
  conversationParamsSchema,
  conversationQuerySchema,
  conversationContextSchema,
  listConversationsQuerySchema,
} from "../validations/aiValidation.js";
import {
  startChatTurnParamsSchema,
  startChatTurnBodySchema,
  chatTurnParamsSchema,
  chatEventsParamsSchema,
  cancelChatTurnParamsSchema,
} from "../validations/chatStreamValidation.js";
import {
  proposalActionSchema,
  proposalParamsSchema,
} from "../validations/A2UI/taskProposalValidation.js";

const router = express.Router();
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.use(attachmentRoutes);
router.use(skillRoutes);

router.post(
  "/generate-tasks",
  protect,
  validate({ body: generateTasksSchema }),
  generateTasksWithRequirement,
);
router.post("/chat", protect, validate({ body: chatSchema }), responseToUser);
router.post(
  "/chat-mcp",
  protect,
  validate({ body: conversationChatSchema }),
  chatWithMcp,
);

router.post(
  "/conversations",
  protect,
  validate({ body: conversationCreateSchema }),
  createConversation,
);
router.patch(
  "/conversations/:conversationId/context",
  protect,
  validate({
    params: conversationParamsSchema,
    body: conversationContextSchema,
  }),
  updateConversationContext,
);
router.get("/conversations/capabilities", protect, getConversationCapabilities);
router.get("/conversations/latest", protect, getConversation);
router.get(
  "/conversations",
  protect,
  validate({ query: listConversationsQuerySchema }),
  listConversations,
);
router.get(
  "/conversations/:conversationId",
  protect,
  validate({
    params: conversationParamsSchema,
    query: conversationQuerySchema,
  }),
  getConversation,
);

router.post(
  "/conversations/:conversationId/turns",
  protect,
  validate({
    params: startChatTurnParamsSchema,
    body: startChatTurnBodySchema,
  }),
  startChatTurn,
);

router.get(
  "/conversations/:conversationId/turns/:turnId",
  protect,
  validate({
    params: chatTurnParamsSchema,
  }),
  getChatTurn,
);

router.get(
  "/conversations/:conversationId/turns/:turnId/events",
  protect,
  validate({
    params: chatEventsParamsSchema,
  }),
  streamChatEvents,
);

router.post(
  "/conversations/:conversationId/turns/:turnId/cancel",
  protect,
  validate({
    params: cancelChatTurnParamsSchema,
  }),
  cancelChatTurn,
);

router.post(
  "/conversations/:conversationId/proposals/:proposalId/actions",
  protect,
  express.json({ limit: "128kb" }),
  validate({
    params: proposalParamsSchema,
    body: proposalActionSchema,
  }),
  handleProposalAction,
);

export default router;
