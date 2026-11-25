import express from "express";
import { protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
  deleteAll,
  getPushConfig,
  getCurrentPushSubscription,
  upsertPushSubscription,
  updatePushPreferences,
  deletePushSubscription,
} from "../controllers/notificationController.js";
import {
  notificationQuerySchema,
  notificationParamsSchema,
  notificationBodySchema,
  pushSubscriptionQuerySchema,
  pushSubscriptionUpsertSchema,
  pushSubscriptionUpdatePrefsSchema,
  pushSubscriptionDeleteSchema,
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
router.delete("/", validate({ body: notificationBodySchema }), deleteAll);
router.patch(
  "/read-all",
  validate({ body: notificationBodySchema }),
  markAllRead,
);
router.get("/push/config", getPushConfig);
router.get(
  "/push/subscriptions/current",
  validate({ query: pushSubscriptionQuerySchema }),
  getCurrentPushSubscription,
);
router.post(
  "/push/subscriptions",
  validate({ body: pushSubscriptionUpsertSchema }),
  upsertPushSubscription,
);
router.patch(
  "/push/subscriptions",
  validate({ body: pushSubscriptionUpdatePrefsSchema }),
  updatePushPreferences,
);
router.delete(
  "/push/subscriptions",
  validate({ body: pushSubscriptionDeleteSchema }),
  deletePushSubscription,
);
router.patch(
  "/:id/read",
  validate({ params: notificationParamsSchema, body: notificationBodySchema }),
  markRead,
);
export default router;
