import express from "express";
import { protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
} from "../controllers/notificationController.js";
import {
  notificationQuerySchema,
  notificationParamsSchema,
  notificationBodySchema,
} from "../validations/notificationValidation.js";
const router = express.Router();
router.use((_req, res, next) => {
  res.locals.notificationReadCutoff = res.locals.requestStartedAt ?? new Date();
  next();
});
router.use(protect);
router.get(
  "/",
  validate({ query: notificationQuerySchema }),
  listNotifications,
);
router.get("/unread-count", unreadCount);
router.patch(
  "/read-all",
  validate({ body: notificationBodySchema }),
  markAllRead,
);
router.patch(
  "/:id/read",
  validate({ params: notificationParamsSchema, body: notificationBodySchema }),
  markRead,
);
export default router;
