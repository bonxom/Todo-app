import express from "express";
import { protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  createSkill,
  deleteSkill,
  getSkillById,
  getSkillTemplateById,
  importSkillFromTemplate,
  listSkills,
  listSkillTemplates,
  updateSkill,
} from "../controllers/skillController.js";
import {
  skillCreateSchema,
  skillDeleteQuerySchema,
  skillImportTemplateSchema,
  skillParamsSchema,
  skillUpdateSchema,
  templateParamsSchema,
} from "../validations/skillValidation.js";

const router = express.Router();

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.get("/skills", protect, listSkills);
router.post(
  "/skills",
  protect,
  validate({ body: skillCreateSchema }),
  createSkill,
);

// Static / specific routes must be declared before /skills/:skillId
router.post(
  "/skills/from-template",
  protect,
  validate({ body: skillImportTemplateSchema }),
  importSkillFromTemplate,
);

router.get("/skill-templates", protect, listSkillTemplates);
router.get(
  "/skill-templates/:templateId",
  protect,
  validate({ params: templateParamsSchema }),
  getSkillTemplateById,
);

router.get(
  "/skills/:skillId",
  protect,
  validate({ params: skillParamsSchema }),
  getSkillById,
);

router.put(
  "/skills/:skillId",
  protect,
  validate({ params: skillParamsSchema, body: skillUpdateSchema }),
  updateSkill,
);

router.delete(
  "/skills/:skillId",
  protect,
  validate({ params: skillParamsSchema, query: skillDeleteQuerySchema }),
  deleteSkill,
);

export default router;
