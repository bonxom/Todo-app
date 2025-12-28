import "dotenv/config";
import express from "express";
import { connectDB } from "./config/db.js";
import cors from "cors";    
import morgan from "morgan";

import userRouter from "./route/userRoute.js";
import categoryRouter from "./route/categoryRoute.js";
import taskRouter from "./route/taskRoute.js";
import authRouter from "./route/authRoute.js";
import { initializeAdmin } from "./config/initialize.js";

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

console.log('Hello backend');
const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

await connectDB();
console.log("Database connected");

// Initialize admin account
await initializeAdmin();

app.get("/", (req, res) => {
    res.send("This is backend of Todo App");
});

// routes...
app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use('/categories', categoryRouter);
app.use('/tasks', taskRouter);

app.listen(PORT, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});

export default app;