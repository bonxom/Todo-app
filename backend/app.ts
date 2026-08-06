import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createCorsOptions, getServerConfig, validateServerEnv } from './config/env.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middlewares/errorHandler.js';
import userRouter from './routes/userRoute.js';
import categoryRouter from './routes/categoryRoute.js';
import projectRouter from './routes/projectRoute.js';
import taskRouter from './routes/taskRoute.js';
import authRouter from './routes/authRoute.js';
import aiRouter from './routes/aiRoutes.js';
import statRouter from './routes/statRoute.js';

const app = express();

app.use(cors(createCorsOptions()));
app.use(morgan('dev'));
app.use(express.json());

let startupPromise: Promise<void> | undefined;

const ensureAppReady = async (): Promise<void> => {
  if (!startupPromise) {
    startupPromise = (async () => {
      validateServerEnv();
      await connectDB();
    })().catch((error: unknown) => {
      startupPromise = undefined;
      throw error;
    });
  }

  return startupPromise;
};

app.get('/healthz', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureAppReady();
    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await ensureAppReady();
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/', (_req: Request, res: Response) => {
  res.send('This is backend of Todo App');
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/ai', aiRouter);
app.use('/api/stats', statRouter);

app.use(errorHandler);

export default app;
export { ensureAppReady };
