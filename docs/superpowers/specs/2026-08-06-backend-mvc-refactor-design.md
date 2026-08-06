# Backend MVC + Layered Architecture Refactor

**Date:** 2026-08-06
**Status:** Design approved
**Approach:** Full Layered (Approach A)

## Goal

Refactor the Express backend from fat controllers into a clean MVC + layered architecture:

```
config/        → system-level configuration
routes/        → API endpoint definitions
controllers/   → request/response handling, no business logic
services/      → business logic
repositories/  → data access layer, database queries
models/        → Mongoose schemas
validations/   → Zod request validation schemas
middlewares/   → reusable request pipeline functions
utils/         → shared helper functions
libs/          → external service integrations
constants/     → constant values
app.js         → Express app initialization
server.js      → server start (listen)
```

## Current State

```
backend/
├── index.js                    # Express app + server start (103 lines)
├── config/
│   ├── db.js                   # MongoDB connection (lazy singleton)
│   ├── env.js                  # CORS, server config, env validation, AI config
│   └── initialize.js           # Default categories + stats seeding
├── controller/                 # FAT — business logic + DB + validation + stats all inline
│   ├── taskController.js       # 540 lines
│   ├── projectController.js    # 347 lines
│   ├── statController.js       # 485 lines — hybrid: HTTP handlers + internal helpers
│   ├── authController.js       # 193 lines
│   ├── categoryController.js   # 149 lines
│   ├── userController.js       # 133 lines
│   └── aiController.js         # 223 lines — AI client init inline
├── middleware/
│   └── auth.js                 # protect, authorize
├── model/
│   ├── Task.js
│   ├── Category.js
│   ├── Project.js
│   ├── Stat.js
│   └── User.js
├── route/
│   ├── taskRoute.js
│   ├── authRoute.js
│   ├── categoryRoute.js
│   ├── projectRoute.js
│   ├── statRoute.js
│   ├── userRoute.js
│   └── aiRoutes.js
└── utils/
    ├── dateTime.js
    └── generateToken.js
```

### Key Problem: Fat Controllers

`taskController.js` (540 lines) contains:
- Request parsing and response sending
- Business rules: category ownership validation, project completion checks, status transitions
- Database queries: `Task.create()`, `Task.find()`, `Task.findByIdAndUpdate()`
- Stat updates: calls `addCompletedTasks`, `addGivenUpTasks`, etc.
- Helper functions: `buildTaskAccessQuery`, `resolveProjectUpdate`, `parseTaskDateRangeQuery`, `applyCompletionTimestampTransition`, `userOwnsTask`

### Key Problem: statController.js is a Hybrid

`statController.js` exports both:
- HTTP handlers: `getStats`, `getCompletedTasksByDate`
- Internal helpers imported by `taskController.js`: `addCompletedTasks`, `addGivenUpTasks`, `addStartTask`, `addInProgressTask`, `addPendingTask`, `addRawInprogressTasks`, `addFinishTasks`, `addGiveUpTasks`, `removeCompletedTasks`, `removeGivenUpTasks`

This creates an awkward import where controllers import from other controllers.

## Target State

```
backend/
├── app.js                          # Express app init, middleware, route mounting
├── server.js                       # Server start: validate env, connect DB, listen
├── config/
│   ├── db.js                       # (unchanged)
│   ├── env.js                      # (unchanged)
│   └── initialize.js               # (unchanged)
├── constants/
│   ├── taskStatus.js               # TASK_STATUSES, FINISHED_STATUSES, ACTIVE_STATUSES
│   ├── priority.js                 # PRIORITIES
│   ├── projectStatus.js            # PROJECT_STATUSES
│   └── datePatterns.js             # DATE regex patterns (moved from utils/dateTime.js)
├── models/                         # Renamed from model/
│   ├── Task.js                     # (unchanged logic)
│   ├── Category.js                 # (unchanged logic)
│   ├── Project.js                  # (unchanged logic)
│   ├── Stat.js                     # (unchanged logic)
│   └── User.js                     # (unchanged logic)
├── validations/
│   ├── taskValidation.js           # createTaskSchema, updateTaskSchema
│   ├── authValidation.js           # registerSchema, loginSchema, changePasswordSchema
│   ├── categoryValidation.js       # createCategorySchema, updateCategorySchema
│   ├── projectValidation.js        # createProjectSchema, updateProjectSchema
│   ├── userValidation.js           # createUserSchema, updateUserSchema
│   └── aiValidation.js             # generateTasksSchema, chatSchema
├── repositories/
│   ├── taskRepository.js           # findById, findWithAccess, create, updateById, deleteById, aggregate, populate
│   ├── categoryRepository.js       # findByUser, findById, findByUserAndName, create, updateById, deleteById
│   ├── projectRepository.js        # findByUser, findById, findByUserAndName, create, updateById, deleteById
│   ├── userRepository.js           # findById, findByEmail, create, updateById, deleteById, findAll
│   └── statRepository.js           # findByUser, createOrUpdate, getUserTaskData, aggregateDailyStats
├── services/
│   ├── taskService.js              # create, getAll, getById, update, finish, start, giveUp, delete
│   ├── categoryService.js          # create, getAll, getById, update, delete (with task reassignment)
│   ├── projectService.js           # create, getAll, getById, update, delete, getTasks, computeSummary
│   ├── authService.js              # register, login, getMe, changePassword, updateInfo, selfDelete, generateToken
│   ├── userService.js              # admin CRUD: create, getAll, getById, update, delete
│   ├── statService.js              # getStats, getCompletedTasksByDate, + all incremental updaters
│   └── aiService.js                # generateTasks, chatResponse
├── controllers/                    # Renamed from controller/
│   ├── taskController.js           # Thin: parse req, call service, send res (~80 lines)
│   ├── categoryController.js       # (~50 lines)
│   ├── projectController.js        # (~70 lines)
│   ├── authController.js           # (~60 lines)
│   ├── userController.js           # (~50 lines)
│   ├── statController.js           # (~20 lines — just getStats, getCompletedTasksByDate)
│   └── aiController.js             # (~20 lines)
├── routes/                         # Renamed from route/
│   ├── taskRoute.js
│   ├── authRoute.js
│   ├── categoryRoute.js
│   ├── projectRoute.js
│   ├── statRoute.js
│   ├── userRoute.js
│   └── aiRoutes.js
├── middlewares/                    # Renamed from middleware/
│   ├── auth.js                     # protect, authorize (unchanged)
│   ├── validate.js                 # Generic Zod validation middleware
│   └── errorHandler.js             # Centralized error handler
├── libs/
│   └── aiClient.js                 # OpenAI client singleton
└── utils/
    ├── dateTime.js                 # normalizeTaskDateInput, getStartOfToday (unchanged)
    ├── errors.js                   # Custom error classes
    └── generateToken.js            # DELETED — merged into services/authService.js
```

**Total: ~19 files → ~45 files.** Each file has exactly one responsibility.

## Layer Design

### 1. Constants (`constants/`)

Extract all magic values currently scattered across controllers into named constants:

```js
// constants/taskStatus.js
export const TASK_STATUSES = ['pending', 'in-progress', 'completed', 'given-up'];
export const FINISHED_STATUSES = ['completed', 'given-up'];
export const ACTIVE_STATUSES = ['pending', 'in-progress'];

// constants/priority.js
export const PRIORITIES = ['Low', 'Medium', 'High'];

// constants/projectStatus.js
export const PROJECT_STATUSES = ['active', 'completed'];

// constants/datePatterns.js
export const DATE_ONLY_PATTERN = /^(\d{4})[-/](\d{2})[-/](\d{2})$/;
export const DATE_TIME_LOCAL_BARE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:\d{2})?$/;
export const DATE_TIME_WITH_TZ_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
export const DISPLAY_DATE_TIME_PATTERN = /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/;
export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
```

### 2. Validations (`validations/`)

Zod schemas per resource. Each export covers create and update variants:

```js
// validations/taskValidation.js
import { z } from 'zod';
import { PRIORITIES, TASK_STATUSES } from '../constants/index.js';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  categoryId: z.string().optional(),
  projectId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  categoryId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});
```

All other validation files follow the same pattern.

### 3. Repositories (`repositories/`)

Data access only — accept parameters, return Mongoose documents. Zero business logic.

```js
// repositories/taskRepository.js
import Task from '../models/Task.js';

const TASK_POPULATE = [
  { path: 'categoryId', select: 'name userId', populate: { path: 'userId', select: 'name email' } },
  { path: 'projectId', select: 'name description color status userId', populate: { path: 'userId', select: 'name email' } },
];

export const taskRepository = {
  findById(id) {
    return Task.findById(id);
  },

  findByIdPopulated(id) {
    return Task.findById(id).populate(TASK_POPULATE);
  },

  find(query = {}, options = {}) {
    return Task.find(query).sort(options.sort || { dueDate: 1, createdAt: -1 });
  },

  findPopulated(query = {}, options = {}) {
    return Task.find(query).sort(options.sort || { dueDate: 1, createdAt: -1 }).populate(TASK_POPULATE);
  },

  create(data) {
    return Task.create(data);
  },

  updateById(id, update) {
    return Task.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  },

  updateByIdPopulated(id, update) {
    return Task.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).populate(TASK_POPULATE);
  },

  deleteById(id) {
    return Task.findByIdAndDelete(id);
  },

  aggregate(pipeline) {
    return Task.aggregate(pipeline);
  },
};
```

All repositories follow this pattern — simple method names, no domain logic, just Mongoose calls.

### 4. Services (`services/`)

Business logic layer. Services call repositories and other services. They throw errors (using custom error classes), never call `res.status().json()`.

```js
// services/taskService.js
import { taskRepository } from '../repositories/taskRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { statService } from './statService.js';
import { normalizeTaskDateInput } from '../utils/dateTime.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { TASK_STATUSES } from '../constants/taskStatus.js';

const resolveCategory = async (categoryId, userId) => {
  if (categoryId) {
    const category = await categoryRepository.findById(categoryId);
    if (!category || category.userId.toString() !== userId.toString()) {
      throw new ValidationError('Invalid categoryId');
    }
    return categoryId;
  }
  // Fall back to Uncategorized
  const uncategorized = await categoryRepository.findByUserAndName(userId, 'Uncategorized');
  if (!uncategorized) throw new ValidationError('Uncategorized category not found');
  return uncategorized._id;
};

const resolveProject = async (projectId, userId, currentProjectId = null) => {
  if (projectId === undefined) return { shouldUpdate: false };
  if (projectId === '' || projectId === null) return { shouldUpdate: true, value: null };

  const project = await projectRepository.findById(projectId);
  if (!project || project.userId.toString() !== userId.toString()) {
    throw new ValidationError('Invalid projectId');
  }

  const normalizedCurrent = currentProjectId?.toString?.() || null;
  const normalizedNext = project._id.toString();
  if (project.status === 'completed' && normalizedNext !== normalizedCurrent) {
    throw new ValidationError('Completed projects cannot be assigned to tasks');
  }

  return { shouldUpdate: true, value: project._id };
};

const verifyOwnership = async (task, user) => {
  if (user.role === 'ADMIN') return;
  // ... ownership check via categoryId/projectId ...
  // Throws ForbiddenError if not authorized
};

export const taskService = {
  async createTask(data, userId) {
    const categoryId = await resolveCategory(data.categoryId, userId);
    const projectUpdate = await resolveProject(data.projectId, userId);
    const startDate = normalizeTaskDateInput(data.startDate);
    const dueDate = normalizeTaskDateInput(data.dueDate);

    if (startDate.error || dueDate.error) {
      throw new ValidationError(startDate.error || dueDate.error);
    }

    const task = await taskRepository.create({
      title: data.title,
      description: data.description,
      status: 'in-progress',
      priority: data.priority,
      categoryId,
      projectId: projectUpdate.shouldUpdate ? projectUpdate.value : null,
      startDate: startDate.shouldUpdate ? startDate.value : undefined,
      dueDate: dueDate.shouldUpdate ? dueDate.value : undefined,
    });

    await statService.incrementInProgress(userId);
    return taskRepository.findByIdPopulated(task._id);
  },

  async getAllTasks(user, queryParams) {
    const accessQuery = await buildTaskAccessQuery(user);
    const dateRange = parseTaskDateRangeQuery(queryParams);
    if (dateRange.error) throw new ValidationError(dateRange.error);

    return taskRepository.findPopulated(
      { ...accessQuery, ...(dateRange.filter || {}) }
    );
  },

  async getTaskById(id, user) {
    const task = await taskRepository.findByIdPopulated(id);
    if (!task) throw new NotFoundError('Task not found');
    await verifyOwnership(task, user);
    return task;
  },

  async updateTask(id, data, user) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('Task not found');
    await verifyOwnership(task, user);

    const update = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.description !== undefined) update.description = data.description;
    if (data.status !== undefined) {
      if (!TASK_STATUSES.includes(data.status)) throw new ValidationError('Invalid status');
      update.status = data.status;
    }
    if (data.priority !== undefined) update.priority = data.priority;
    if (data.categoryId !== undefined) {
      update.categoryId = await resolveCategory(data.categoryId, user._id);
    }

    const projectUpdate = await resolveProject(
      data.projectId, user._id,
      task.projectId?._id || task.projectId || null
    );
    if (projectUpdate.error) throw new ValidationError(projectUpdate.error);
    if (projectUpdate.shouldUpdate) update.projectId = projectUpdate.value;

    // ... date parsing and completion timestamp logic ...

    if (Object.keys(update).length === 0) {
      throw new ValidationError('No fields to update');
    }

    return taskRepository.updateByIdPopulated(id, update);
  },

  async finishTask(id, user) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('Task not found');
    await verifyOwnership(task, user);

    if (task.status === 'completed') throw new ValidationError('Task is already completed');

    task.status = 'completed';
    task.completedAt = new Date();
    task.isOverDue = task.dueDate && new Date() > task.dueDate;
    await task.save();

    const categoryName = task.categoryId?.name
      || (await categoryRepository.findById(task.categoryId?._id))?.name;
    if (task.categoryId?._id && categoryName) {
      await statService.incrementCompleted(user._id, task.categoryId._id, categoryName);
    }

    return taskRepository.findByIdPopulated(id);
  },

  async startTask(id, user) { /* similar pattern */ },
  async giveUpTask(id, user) { /* similar pattern */ },
  async deleteTask(id, user) { /* similar pattern */ },
};
```

**Private helpers like `resolveCategory`, `resolveProject`, `buildTaskAccessQuery`, `userOwnsTask`, `parseTaskDateRangeQuery`, `applyCompletionTimestampTransition` become module-level private functions within the service file** — they're implementation details, not exports.

### 5. Controllers (`controllers/`)

Thin. Parse the request, delegate to service, send the response. Each method is ~5 lines:

```js
// controllers/taskController.js
import { taskService } from '../services/taskService.js';

export const createTask = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.validatedBody, req.user._id);
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    next(error);
  }
};

export const getAllTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getAllTasks(req.user, req.query);
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user);
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

// ... same pattern for updateTask, finishTask, startTask, giveUpTask, deleteTask,
//     getTodayDeadlines, getTaskByStatus, getTaskByCategory
```

### 6. Routes (`routes/`)

Add `validate` middleware for POST/PUT endpoints. GET/DELETE routes stay unchanged:

```js
// routes/taskRoute.js
import express from 'express';
import { createTask, getAllTasks, getTaskById, updateTask, startTask, finishTask, giveUpTask, deleteTask, getTodayDeadlines, getTaskByStatus, getTaskByCategory } from '../controllers/taskController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createTaskSchema, updateTaskSchema } from '../validations/taskValidation.js';

const router = express.Router();

router.post('/', protect, validate(createTaskSchema), createTask);
router.get('/', protect, getAllTasks);
router.get('/today-deadlines', protect, getTodayDeadlines);
router.get('/status/:status', protect, getTaskByStatus);
router.get('/category/:categoryId', protect, getTaskByCategory);
router.get('/:id', protect, getTaskById);
router.put('/:id', protect, validate(updateTaskSchema), updateTask);
router.put('/:id/start', protect, startTask);
router.put('/:id/finish', protect, finishTask);
router.put('/:id/give-up', protect, giveUpTask);
router.delete('/:id', protect, deleteTask);

export default router;
```

### 7. Middlewares (`middlewares/`)

Two new middlewares added alongside the existing `auth.js`:

```js
// middlewares/validate.js
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.errors[0].message });
  }
  req.validatedBody = result.data;
  next();
};
```

```js
// middlewares/errorHandler.js
import { AppError } from '../utils/errors.js';

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
};
```

### 8. Custom Error Classes (`utils/errors.js`)

```js
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}
```

### 9. Libs (`libs/`)

```js
// libs/aiClient.js
import OpenAI from 'openai';
import { getAiApiKey, getAiBaseUrl } from '../config/env.js';

let client;

export const getAiClient = () => {
  if (!client) {
    const apiKey = getAiApiKey();
    const baseURL = getAiBaseUrl();
    if (!apiKey) throw new AppError('Missing AI_API_KEY', 500);
    if (!baseURL) throw new AppError('Missing AI_BASE_URL', 500);
    client = new OpenAI({ apiKey, baseURL, timeout: 60000 });
  }
  return client;
};
```

### 10. `app.js` + `server.js`

Split current `index.js`:

```js
// app.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createCorsOptions } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
// ... route imports ...

const app = express();

app.use(cors(createCorsOptions()));
app.use(morgan('dev'));
app.use(express.json());

// Lazy startup for Vercel compatibility
let startupPromise;
export const ensureAppReady = async () => { /* ... same as current ... */ };

app.get('/healthz', async (req, res, next) => { /* ... */ });
app.use(async (req, res, next) => { /* ensureAppReady wrapper ... */ });

app.get('/', (req, res) => { res.send('This is backend of Todo App'); });

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/ai', aiRouter);
app.use('/api/stats', statRouter);

app.use(errorHandler);

export default app;
```

```js
// server.js
import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import { getServerConfig, validateServerEnv } from './config/env.js';

const { host, port } = getServerConfig();

const start = async () => {
  validateServerEnv();
  await connectDB();
  app.listen(port, host, () => console.log(`Server running on http://${host}:${port}`));
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
```

### 11. The `statController.js` Split

Currently the most problematic file. Splitting strategy:

| Current Export | Moves To |
|---|---|
| `getStats` (HTTP handler) | `controllers/statController.js` |
| `getCompletedTasksByDate` (HTTP handler) | `controllers/statController.js` |
| `addCompletedTasks` (internal helper) | `services/statService.js` as `incrementCompleted()` |
| `addGivenUpTasks` (internal helper) | `services/statService.js` as `incrementGivenUp()` |
| `addStartTask` (internal helper) | `services/statService.js` as `incrementStart()` |
| `addInProgressTask` (internal helper) | `services/statService.js` as `incrementInProgress()` |
| `addPendingTask` (internal helper) | `services/statService.js` as `incrementPending()` |
| `addRawInprogressTasks` (internal helper) | `services/statService.js` as `incrementRawInProgress()` |
| `addFinishTasks` (internal helper) | `services/statService.js` as `incrementFinish()` |
| `addGiveUpTasks` (internal helper) | `services/statService.js` as `incrementGiveUp()` |
| `removeCompletedTasks` (internal helper) | `services/statService.js` as `decrementCompleted()` |
| `removeGivenUpTasks` (internal helper) | `services/statService.js` as `decrementGivenUp()` |
| `buildStatsFromTasks` (recalc logic) | `services/statService.js` as `rebuildStats()` |
| `getUserStatTasks` (query helper) | `repositories/statRepository.js` |
| `getCategoryStatPayload` (util) | Inline or in `utils/` |
| `toDateKey`, `DATE_KEY_PATTERN` | `utils/dateTime.js` (toDateKey), `constants/datePatterns.js` |

The coupling `taskController.js` importing from `statController.js` becomes clean: `taskService.js` imports `statService.js`.

## Data Flow

```
HTTP Request
    │
    ▼
routes/          ← matches URL pattern, applies middlewares
    │
    ▼
middlewares/     ← protect (auth), validate (Zod), etc.
    │
    ▼
controllers/     ← extracts req.params, req.validatedBody, req.user
    │             delegates to service, sends response
    ▼
services/        ← business rules, validation, orchestration
    │             calls repositories, calls other services
    ▼
repositories/    ← Mongoose queries only
    │
    ▼
models/          ← Mongoose schema definition
    │
    ▼
MongoDB
```

**Error flow:** Service throws `AppError` subclass → controller `catch` passes to `next(error)` → `errorHandler` middleware maps status code and sends JSON.

## Vercel Compatibility

The current lazy startup pattern (`ensureAppReady`) must be preserved:
- `app.js` exports `app` as the default export (serverless target)
- `server.js` only runs `app.listen()` when `process.env.VERCEL` is falsy
- The `ensureAppReady` middleware wraps all routes

## API Response Compatibility

All API responses maintain the same shape:
- Success: `{ message: "...", task/project/category/user }` or direct array
- Error: `{ message: "..." }`
- Status codes unchanged (200, 201, 400, 401, 403, 404, 500)

## Testing Impact

The layered architecture enables isolated unit testing:
- **Services** can be tested with mocked repositories
- **Repositories** can be tested with an in-memory MongoDB
- **Controllers** can be tested with mocked services
- **Validations** are pure functions testable with data in/data out

## Migration Approach

This is a structural refactor — behavior does not change. Migration can be done incrementally:

1. Create new directories: `constants/`, `validations/`, `repositories/`, `services/`, `libs/`
2. Create `utils/errors.js` (custom error classes)
3. Create constants files (no dependencies)
4. Create validation schemas (no dependencies)
5. Create `middlewares/validate.js` and `middlewares/errorHandler.js`
6. Rename `model/` → `models/`, `middleware/` → `middlewares/`
7. Create `libs/aiClient.js`
8. Create `app.js` and `server.js`
9. For each resource (order: category, user, project, task, stat, auth, ai):
   a. Extract repository
   b. Extract service
   c. Rewrite controller
   d. Update route
   e. Test
10. Remove old files
11. Update `package.json` entry point if needed

## Files NOT Changed

- All model files (renamed directory only)
- `config/db.js`, `config/env.js`, `config/initialize.js`
- `utils/dateTime.js` (except date patterns moved to constants)
- `middlewares/auth.js` (renamed directory, no logic changes)
- `.env`, `.env.example`, `package.json`, `Dockerfile`
- Docker Compose, Vercel config

## Out of Scope

- Adding new features
- Changing API response shapes
- Adding tests (enables them, doesn't write them)
- Changing the frontend
- Switching from CommonJS to ES Modules (already using ESM)
- Adding TypeScript
