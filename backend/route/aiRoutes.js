import { generateTasksWithRequirement, responseToUser } from "../controller/aiController.js";
import { protect, authorize } from '../middleware/auth.js';
import express from 'express';

const router = express.Router();

router.post("/require", protect, generateTasksWithRequirement);
router.post("/chat", protect, responseToUser);

export default router;