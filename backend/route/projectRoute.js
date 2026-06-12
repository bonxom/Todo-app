import express from "express";
import {
    createProject,
    deleteProject,
    getAllProjects,
    getProjectById,
    getProjectTasks,
    updateProject
} from "../controller/projectController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, createProject);
router.get("/", protect, getAllProjects);
router.get("/:id/tasks", protect, getProjectTasks);
router.get("/:id", protect, getProjectById);
router.put("/:id", protect, updateProject);
router.delete("/:id", protect, deleteProject);

export default router;
