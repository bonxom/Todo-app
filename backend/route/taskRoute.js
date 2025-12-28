import express from "express";
import {
    createTask,
    getAllTasks,
    getTaskById,
    updateTask,
    startTask,
    finishTask,
    giveUpTask,
    deleteTask,
    getTodayDeadlines,
    getTaskByStatus,
    getTaskByCategory
} from "../controller/taskController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, createTask);
router.get("/", protect, getAllTasks); // User can see their own tasks
router.get("/today-deadlines", protect, getTodayDeadlines);
router.get("/status/:status", protect, getTaskByStatus);
router.get("/category/:categoryId", protect, getTaskByCategory);
router.get("/:id", protect, getTaskById);
router.put("/:id", protect, updateTask);
router.put("/:id/start", protect, startTask);
router.put("/:id/finish", protect, finishTask);
router.put("/:id/give-up", protect, giveUpTask);
router.delete("/:id", protect, deleteTask);

export default router;

