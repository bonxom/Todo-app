import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { attachmentService } from "../services/attachmentService.js";
import {
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
} from "../controllers/attachmentController.js";
import { MAX_ATTACHMENT_BYTES } from "../utils/attachmentFile.js";
import { AppError } from "../error/AppError.js";
import { ATTACHMENT_ERROR } from "../error/definitions/attachmentErrors.js";
const router = Router();
const base = "/conversations/:conversationId/attachments";
const params = z.object({ conversationId: z.uuid() });
const fileParams = params.extend({ attachmentId: z.uuid() });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1, fields: 0, parts: 2 },
}).single("file");
router.post(
  base,
  protect,
  validate({ params }),
  async (req, _res, next) => {
    await attachmentService.authorizeConversation(
      String(req.user!._id),
      req.validatedParams!.conversationId,
    );
    next();
  },
  (req, res, next) => {
    upload(req, res, (error: unknown) =>
      next(
        error instanceof multer.MulterError
          ? new AppError(
              error.code === "LIMIT_FILE_SIZE"
                ? ATTACHMENT_ERROR.TOO_LARGE
                : ATTACHMENT_ERROR.INVALID,
            )
          : error
            ? new AppError(ATTACHMENT_ERROR.INVALID)
            : undefined,
      ),
    );
  },
  uploadAttachment,
);
router.get(
  `${base}/:attachmentId`,
  protect,
  validate({ params: fileParams }),
  downloadAttachment,
);
router.delete(
  `${base}/:attachmentId`,
  protect,
  validate({ params: fileParams }),
  deleteAttachment,
);
export default router;
