import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createCorsOptions, getServerConfig, validateServerEnv } from './config/env.js';
import { connectDB } from './config/db.js';
import { AppError } from './error/AppError.js';
import { COMMON_ERROR } from './error/definitions/commonErrors.js';
import { errorHandler, notFoundHandler, requestContext } from './error/index.js';
import userRouter from './routes/userRoute.js';
import categoryRouter from './routes/categoryRoute.js';
import projectRouter from './routes/projectRoute.js';
import taskRouter from './routes/taskRoute.js';
import authRouter from './routes/authRoute.js';
import aiRouter from './routes/aiRoutes.js';
import statRouter from './routes/statRoute.js';

const app = express();

app.use(requestContext);

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

app.get('/healthz', async (_req: Request, res: Response) => {
  await ensureAppReady().catch((error: unknown) => {
    throw new AppError(COMMON_ERROR.SERVICE_UNAVAILABLE, { cause: error });
  });
  res.status(200).json({ ok: true });
});

app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  await ensureAppReady().catch((error: unknown) => {
    throw new AppError(COMMON_ERROR.SERVICE_UNAVAILABLE, { cause: error });
  });
  next();
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

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
export { ensureAppReady };
