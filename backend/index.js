import "dotenv/config";
import express from "express";
import { connectDB } from "./config/db.js";
import cors from "cors";    
import morgan from "morgan";

import userRouter from "./route/userRoute.js";
import categoryRouter from "./route/categoryRoute.js";
import projectRouter from "./route/projectRoute.js";
import taskRouter from "./route/taskRoute.js";
import authRouter from "./route/authRoute.js";
import aiRouter from "./route/aiRoutes.js";
import statRouter from "./route/statRoute.js";
import {
    createCorsOptions,
    getServerConfig,
    validateServerEnv,
} from "./config/env.js";

const app = express();
const { host, port } = getServerConfig();

app.use(cors(createCorsOptions()));
app.use(morgan('dev'));
app.use(express.json());

let startupPromise;

const ensureAppReady = async () => {
    if (!startupPromise) {
        startupPromise = (async () => {
            validateServerEnv();
            await connectDB();
        })().catch((error) => {
            startupPromise = undefined;
            throw error;
        });
    }

    return startupPromise;
};

app.get("/healthz", async (req, res, next) => {
    try {
        await ensureAppReady();
        res.status(200).json({ ok: true });
    } catch (error) {
        next(error);
    }
});

app.use(async (req, res, next) => {
    try {
        await ensureAppReady();
        next();
    } catch (error) {
        next(error);
    }
});

app.get("/", (req, res) => {
    res.send("This is backend of Todo App");
});

// routes...
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/ai', aiRouter);
app.use('/api/stats', statRouter);

app.use((error, req, res, next) => {
    console.error("Unhandled server error:", error.message);

    if (res.headersSent) {
        next(error);
        return;
    }

    if (req.path.startsWith("/api/") || req.path === "/healthz") {
        res.status(500).json({ message: error.message || "Internal server error" });
        return;
    }

    res.status(500).send("Internal server error");
});

if (!process.env.VERCEL) {
    ensureAppReady()
        .then(() => {
            app.listen(port, () => {
                console.log(`Server is running on http://${host}:${port}`);
            });
        })
        .catch((error) => {
            console.error("Failed to start server:", error);
            process.exit(1);
        });
}

export default app;
