import { generateTasksWithRequirement, responseToUser } from "../controllers/aiController.js";
import { protect, authorize } from '../middlewares/auth.js';
import express from 'express';

const router = express.Router();

router.post("/require", protect, generateTasksWithRequirement);
router.post("/chat", protect, responseToUser);

export default router;