import "dotenv/config";
import express from "express";
import { connectDB } from "./config/db.js";
import cors from "cors";    
import morgan from "morgan";

import userRouter from "./route/userRoute.js";
import categoryRouter from "./route/categoryRoute.js";
import taskRouter from "./route/taskRoute.js";
import authRouter from "./route/authRoute.js";
import aiRouter from "./route/aiRoutes.js";
import { init } from "./config/initialize.js";

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

console.log('Hello backend');
const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

await connectDB();
console.log("Database connected");

// init values
await init();

app.get("/", (req, res) => {
    res.send("This is backend of Todo App");
});

// routes...
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/ai', aiRouter);

app.listen(PORT, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});

export default app;