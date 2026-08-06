# Backend MVC + Layered Architecture Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Express backend from fat controllers into a clean MVC + layered architecture (controllers → services → repositories → models) with Zod validation, custom error classes, and separated app.js/server.js.

**Architecture:** Full layered approach — every resource gets controller, service, repository, and validation files. Each file has exactly one responsibility. The refactor preserves all existing API response shapes, status codes, and Vercel compatibility.

**Tech Stack:** Express 5, Mongoose, Zod v4, OpenAI SDK, jsonwebtoken, bcryptjs

## Global Constraints

- All existing API response shapes and status codes MUST remain unchanged
- Vercel lazy startup pattern (`ensureAppReady`) MUST be preserved in `app.js`
- `server.js` MUST check `process.env.VERCEL` before calling `app.listen()`
- All existing model schemas, hooks, indexes, and statics MUST remain untouched
- All existing `config/` files MUST remain untouched
- `dotenv/config` import MUST be in `server.js`, NOT in `app.js` (Vercel compat)
- Use `z.enum()` with imported constant arrays (not `z.enum(['Low', 'Medium', 'High'])`)

---

### Task 1: Create directory structure and constants

**Files:**
- Create: `backend/constants/taskStatus.js`
- Create: `backend/constants/priority.js`
- Create: `backend/constants/projectStatus.js`
- Create: `backend/constants/datePatterns.js`

**Interfaces:**
- Produces:
  - `TASK_STATUSES`, `FINISHED_STATUSES`, `ACTIVE_STATUSES` from `constants/taskStatus.js`
  - `PRIORITIES` from `constants/priority.js`
  - `PROJECT_STATUSES` from `constants/projectStatus.js`
  - `DATE_ONLY_PATTERN`, `DATE_TIME_LOCAL_BARE_PATTERN`, `DATE_TIME_WITH_TZ_PATTERN`, `DISPLAY_DATE_TIME_PATTERN`, `DATE_KEY_PATTERN` from `constants/datePatterns.js`

- [ ] **Step 1: Create new directories**

```bash
mkdir -p backend/constants backend/validations backend/repositories backend/services backend/libs
```

- [ ] **Step 2: Write constants/taskStatus.js**

```js
export const TASK_STATUSES = ['pending', 'in-progress', 'completed', 'given-up'];
export const FINISHED_STATUSES = ['completed', 'given-up'];
export const ACTIVE_STATUSES = ['pending', 'in-progress'];
```

- [ ] **Step 3: Write constants/priority.js**

```js
export const PRIORITIES = ['Low', 'Medium', 'High'];
```

- [ ] **Step 4: Write constants/projectStatus.js**

```js
export const PROJECT_STATUSES = ['active', 'completed'];
```

- [ ] **Step 5: Write constants/datePatterns.js**

```js
export const DATE_ONLY_PATTERN = /^(\d{4})[-/](\d{2})[-/](\d{2})$/;
export const DATE_TIME_LOCAL_BARE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:\d{2})?$/;
export const DATE_TIME_WITH_TZ_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
export const DISPLAY_DATE_TIME_PATTERN = /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/;
export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
```

- [ ] **Step 6: Verify files exist**

```bash
ls -la backend/constants/
```

- [ ] **Step 7: Commit**

```bash
git add backend/constants/
git commit -m "feat: add constants directory with task statuses, priorities, project statuses, and date patterns

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Create custom error classes

**Files:**
- Create: `backend/utils/errors.js`

**Interfaces:**
- Produces: `AppError`, `NotFoundError`, `ValidationError`, `ForbiddenError`, `UnauthorizedError`, `ConflictError`
- Each has `message` (string) and `statusCode` (number) properties
- `errorHandler` middleware (Task 4) and all services (Tasks 8-14) consume these

- [ ] **Step 1: Write utils/errors.js**

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

- [ ] **Step 2: Verify file exists**

```bash
ls -la backend/utils/errors.js
```

- [ ] **Step 3: Commit**

```bash
git add backend/utils/errors.js
git commit -m "feat: add custom error classes (AppError, NotFoundError, ValidationError, etc.)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Create Zod validation schemas

**Files:**
- Create: `backend/validations/taskValidation.js`
- Create: `backend/validations/authValidation.js`
- Create: `backend/validations/categoryValidation.js`
- Create: `backend/validations/projectValidation.js`
- Create: `backend/validations/userValidation.js`
- Create: `backend/validations/aiValidation.js`

**Interfaces:**
- Consumes: `PRIORITIES`, `TASK_STATUSES` from `constants/priority.js`, `constants/taskStatus.js`; `PROJECT_STATUSES` from `constants/projectStatus.js`
- Produces: `createTaskSchema`, `updateTaskSchema`; `registerSchema`, `loginSchema`, `changePasswordSchema`; `createCategorySchema`, `updateCategorySchema`; `createProjectSchema`, `updateProjectSchema`; `createUserSchema`, `updateUserSchema`; `generateTasksSchema`, `chatSchema`
- Routes (Task 16) and `validate` middleware (Task 4) consume these

- [ ] **Step 1: Write validations/categoryValidation.js**

```js
import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});
```

- [ ] **Step 2: Write validations/projectValidation.js**

```js
import { z } from 'zod';
import { PROJECT_STATUSES } from '../constants/projectStatus.js';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a six-digit hex color').optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a six-digit hex color').optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});
```

- [ ] **Step 3: Write validations/taskValidation.js**

```js
import { z } from 'zod';
import { PRIORITIES } from '../constants/priority.js';
import { TASK_STATUSES } from '../constants/taskStatus.js';

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

- [ ] **Step 4: Write validations/authValidation.js**

```js
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  dob: z.string().min(1, 'Date of birth is required'),
  nationality: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});
```

- [ ] **Step 5: Write validations/userValidation.js**

```js
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  role: z.enum(['USER', 'ADMIN']).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  dob: z.string().optional(),
  nationality: z.string().max(100).optional(),
});
```

- [ ] **Step 6: Write validations/aiValidation.js**

```js
import { z } from 'zod';

export const generateTasksSchema = z.object({
  userRequirement: z.string().min(1, 'userRequirement is required').max(2000),
});

export const chatSchema = z.object({
  userInput: z.string().min(1, 'userInput is required').max(2000),
});
```

- [ ] **Step 7: Verify all validation files exist**

```bash
ls -la backend/validations/
```

- [ ] **Step 8: Commit**

```bash
git add backend/validations/
git commit -m "feat: add Zod validation schemas for all resources

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Create new middlewares (validate, errorHandler)

**Files:**
- Create: `backend/middlewares/validate.js`
- Create: `backend/middlewares/errorHandler.js`

**Interfaces:**
- Consumes: `AppError` from `utils/errors.js`
- Produces:
  - `validate(schema)` — Express middleware that runs `schema.safeParse(req.body)`, sets `req.validatedBody` on success, returns 400 on failure
  - `errorHandler(err, req, res, next)` — Express error middleware, checks `instanceof AppError`, returns appropriate status/message JSON, falls back to 500

- [ ] **Step 1: Write middlewares/validate.js**

```js
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.errors[0].message });
  }
  req.validatedBody = result.data;
  next();
};
```

- [ ] **Step 2: Write middlewares/errorHandler.js**

```js
import { AppError } from '../utils/errors.js';

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
};
```

- [ ] **Step 3: Verify files exist**

```bash
ls -la backend/middlewares/validate.js backend/middlewares/errorHandler.js
```

- [ ] **Step 4: Commit**

```bash
git add backend/middlewares/validate.js backend/middlewares/errorHandler.js
git commit -m "feat: add Zod validate middleware and centralized error handler

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Create libs/aiClient.js

**Files:**
- Create: `backend/libs/aiClient.js`

**Interfaces:**
- Consumes: `getAiApiKey`, `getAiBaseUrl` from `config/env.js`
- Produces: `getAiClient()` — returns singleton OpenAI client instance, throws `Error` if API key or base URL is missing

- [ ] **Step 1: Write libs/aiClient.js**

```js
import OpenAI from 'openai';
import { getAiApiKey, getAiBaseUrl } from '../config/env.js';

let client;

export const getAiClient = () => {
  if (!client) {
    const apiKey = getAiApiKey();
    const baseURL = getAiBaseUrl();

    if (!apiKey) {
      throw new Error('Missing required environment variable: AI_API_KEY');
    }

    if (!baseURL) {
      throw new Error('Missing required environment variable: AI_BASE_URL');
    }

    client = new OpenAI({ apiKey, baseURL, timeout: 60000 });
  }

  return client;
};
```

- [ ] **Step 2: Verify file exists**

```bash
ls -la backend/libs/aiClient.js
```

- [ ] **Step 3: Commit**

```bash
git add backend/libs/
git commit -m "feat: extract AI client initialization to libs/aiClient.js

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Rename directories (model→models, middleware→middlewares, controller→controllers, route→routes)

**Files:**
- Rename: `backend/model/` → `backend/models/`
- Rename: `backend/middleware/` → `backend/middlewares/`
- Rename: `backend/controller/` → `backend/controllers/`
- Rename: `backend/route/` → `backend/routes/`
- Modify: ALL files that import from these directories

**Interfaces:**
- This is a mechanical rename — no logic changes
- Every file that imports from `../model/`, `../middleware/`, `../controller/`, `../route/` must be updated
- Files to update:
  - `backend/index.js` — 7 route imports + 1 middleware import (already uses `./middleware/auth.js`)
  - `backend/config/initialize.js` — imports from `../model/User.js`, `../model/Category.js`, `../model/Stat.js`, `../model/Task.js`
  - `backend/controllers/authController.js` — `../model/User.js`, `../utils/generateToken.js`
  - `backend/controllers/taskController.js` — `../model/Task.js`, `../model/Category.js`, `../model/Project.js`, `../utils/dateTime.js`, `./statController.js`
  - `backend/controllers/categoryController.js` — `../model/Category.js`, `../model/User.js`
  - `backend/controllers/projectController.js` — `../model/Project.js`, `../model/Task.js`
  - `backend/controllers/statController.js` — `../model/Stat.js`, `../model/Task.js`, `../model/Category.js`, `../model/Project.js`
  - `backend/controllers/userController.js` — `../model/User.js`
  - `backend/controllers/aiController.js` — `../model/Category.js`, `../model/Task.js`, `./statController.js`, `../utils/dateTime.js`, `../config/env.js`
  - `backend/middlewares/auth.js` — `../models/User.js` (path should become this after rename)
  - `backend/routes/taskRoute.js` — `../controllers/taskController.js`, `../middlewares/auth.js`
  - `backend/routes/authRoute.js` — `../controllers/authController.js`, `../middlewares/auth.js`
  - `backend/routes/categoryRoute.js` — `../controllers/categoryController.js`, `../middlewares/auth.js`
  - `backend/routes/projectRoute.js` — `../controllers/projectController.js`, `../middlewares/auth.js`
  - `backend/routes/statRoute.js` — `../controllers/statController.js`, `../middlewares/auth.js`
  - `backend/routes/userRoute.js` — `../controllers/userController.js`, `../middlewares/auth.js`
  - `backend/routes/aiRoutes.js` — `../controllers/aiController.js`, `../middlewares/auth.js`

- [ ] **Step 1: Rename model/ → models/**

```bash
mv backend/model backend/models
```

- [ ] **Step 2: Rename middleware/ → middlewares/**

```bash
mv backend/middleware backend/middlewares
```

- [ ] **Step 3: Rename controller/ → controllers/**

```bash
mv backend/controller backend/controllers
```

- [ ] **Step 4: Rename route/ → routes/**

```bash
mv backend/route backend/routes
```

- [ ] **Step 5: Update imports in config/initialize.js**

Replace `../model/` with `../models/` in all 4 imports:
```js
import User from '../models/User.js';
import Category from '../models/Category.js';
import Stat from '../models/Stat.js';
import Task from '../models/Task.js';
```

- [ ] **Step 6: Update imports in middlewares/auth.js**

Replace `../model/User.js` with `../models/User.js`:
```js
import User from '../models/User.js';
```

- [ ] **Step 7: Update imports in controllers/taskController.js**

Replace `../model/` with `../models/`:
```js
import Task from '../models/Task.js';
import Category from '../models/Category.js';
import Project from '../models/Project.js';
```
Keep `./statController.js`, `../utils/dateTime.js` unchanged.

- [ ] **Step 8: Update imports in controllers/categoryController.js**

```js
import Category from '../models/Category.js';
import User from '../models/User.js';
```

- [ ] **Step 9: Update imports in controllers/projectController.js**

```js
import Project from '../models/Project.js';
import Task from '../models/Task.js';
```

- [ ] **Step 10: Update imports in controllers/statController.js**

```js
import Stat from '../models/Stat.js';
import Task from '../models/Task.js';
import Category from '../models/Category.js';
import Project from '../models/Project.js';
```

- [ ] **Step 11: Update imports in controllers/userController.js**

```js
import User from '../models/User.js';
```

- [ ] **Step 12: Update imports in controllers/authController.js**

```js
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
```

- [ ] **Step 13: Update imports in controllers/aiController.js**

```js
import Category from '../models/Category.js';
import Task from '../models/Task.js';
```

- [ ] **Step 14: Update imports in all route files (7 files)**

Each route file has imports from `../controller/` and `../middleware/auth.js`. Update to:
- `../controllers/` (controller imports)
- `../middlewares/auth.js` (middleware import)

File list: `routes/taskRoute.js`, `routes/authRoute.js`, `routes/categoryRoute.js`, `routes/projectRoute.js`, `routes/statRoute.js`, `routes/userRoute.js`, `routes/aiRoutes.js`

- [ ] **Step 15: Update imports in index.js**

```js
import userRouter from './routes/userRoute.js';
import categoryRouter from './routes/categoryRoute.js';
import projectRouter from './routes/projectRoute.js';
import taskRouter from './routes/taskRoute.js';
import authRouter from './routes/authRoute.js';
import aiRouter from './routes/aiRoutes.js';
import statRouter from './routes/statRoute.js';
```

- [ ] **Step 16: Verify the app starts**

```bash
cd backend && node -e "import('./index.js').then(() => console.log('imports OK')).catch(e => {console.error(e.message); process.exit(1)})"
```

Expected: "imports OK" (or MongoDB connection error, but NOT import errors)

- [ ] **Step 17: Commit**

```bash
git add -A backend/
git commit -m "refactor: rename directories to plural forms (models, controllers, routes, middlewares)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Create all repositories (data access layer)

**Files:**
- Create: `backend/repositories/categoryRepository.js`
- Create: `backend/repositories/userRepository.js`
- Create: `backend/repositories/projectRepository.js`
- Create: `backend/repositories/taskRepository.js`
- Create: `backend/repositories/statRepository.js`

**Interfaces:**
- Consumes: Mongoose models from `../models/`
- Produces: Repository objects with query methods (see each file for exact signatures)
- All services (Tasks 8-14) consume these

- [ ] **Step 1: Write repositories/categoryRepository.js**

```js
import Category from '../models/Category.js';

export const categoryRepository = {
  findById(id) {
    return Category.findById(id);
  },

  findByIdPopulated(id) {
    return Category.findById(id).populate('userId', 'name email');
  },

  findByUser(userId) {
    return Category.find({ userId }).populate('userId', 'name email');
  },

  findAll() {
    return Category.find({}).populate('userId', 'name email');
  },

  findByUserAndName(userId, name) {
    return Category.findOne({ userId, name });
  },

  create(data) {
    return Category.create(data);
  },

  updateById(id, update) {
    return Category.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  },

  deleteById(id) {
    return Category.findByIdAndDelete(id);
  },
};
```

- [ ] **Step 2: Write repositories/userRepository.js**

```js
import User from '../models/User.js';

export const userRepository = {
  findById(id) {
    return User.findById(id);
  },

  findByIdWithPassword(id) {
    return User.findById(id).select('+password');
  },

  findByIdPopulated(id) {
    return User.findById(id).populate('categories', 'name description');
  },

  findByEmail(email) {
    return User.findOne({ email });
  },

  findByEmailWithPassword(email) {
    return User.findOne({ email }).select('+password');
  },

  findAll() {
    return User.find().select('-password').populate('categories', 'name description');
  },

  create(data) {
    return User.create(data);
  },

  updateById(id, update) {
    return User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).select('-password');
  },

  deleteById(id) {
    return User.findByIdAndDelete(id);
  },

  addCategory(userId, categoryId) {
    return User.findByIdAndUpdate(userId, { $push: { categories: categoryId } });
  },

  removeCategory(userId, categoryId) {
    return User.findByIdAndUpdate(userId, { $pull: { categories: categoryId } });
  },
};
```

- [ ] **Step 3: Write repositories/projectRepository.js**

```js
import Project from '../models/Project.js';

export const projectRepository = {
  findById(id) {
    return Project.findById(id);
  },

  findByIdPopulated(id) {
    return Project.findById(id).populate('userId', 'name email');
  },

  findByUser(userId) {
    return Project.find({ userId });
  },

  findByUserPopulated(userId) {
    return Project.find({ userId }).populate('userId', 'name email').sort({ createdAt: -1 });
  },

  findAllPopulated() {
    return Project.find().populate('userId', 'name email').sort({ createdAt: -1 });
  },

  findByUserAndName(userId, name) {
    return Project.findOne({ userId, name });
  },

  create(data) {
    return Project.create(data);
  },

  updateById(id, update) {
    return Project.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  },

  updateByIdPopulated(id, update) {
    return Project.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).populate('userId', 'name email');
  },

  deleteById(id) {
    return Project.findOneAndDelete({ _id: id });
  },
};
```

- [ ] **Step 4: Write repositories/taskRepository.js**

```js
import Task from '../models/Task.js';

const TASK_POPULATE = [
  {
    path: 'categoryId',
    select: 'name userId',
    populate: { path: 'userId', select: 'name email' },
  },
  {
    path: 'projectId',
    select: 'name description color status userId',
    populate: { path: 'userId', select: 'name email' },
  },
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
    return Task.find(query)
      .sort(options.sort || { dueDate: 1, createdAt: -1 })
      .populate(TASK_POPULATE);
  },

  create(data) {
    return Task.create(data);
  },

  updateById(id, update) {
    return Task.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  },

  updateByIdPopulated(id, update) {
    return Task.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
      .populate(TASK_POPULATE);
  },

  deleteById(id) {
    return Task.findByIdAndDelete(id);
  },

  aggregate(pipeline) {
    return Task.aggregate(pipeline);
  },
};
```

- [ ] **Step 5: Write repositories/statRepository.js**

```js
import Stat from '../models/Stat.js';
import Task from '../models/Task.js';
import Category from '../models/Category.js';
import Project from '../models/Project.js';

export const statRepository = {
  findByUser(userId) {
    return Stat.findOne({ userId });
  },

  createOrFind(userId) {
    return Stat.findOne({ userId }) || new Stat({ userId });
  },

  async getTasksByUser(user) {
    if (user.role === 'ADMIN') {
      return Task.find({})
        .populate('categoryId', 'name userId')
        .populate('projectId', 'name userId');
    }

    const [userCategories, userProjects] = await Promise.all([
      Category.find({ userId: user._id }).select('_id name'),
      Project.find({ userId: user._id }).select('_id'),
    ]);

    const ownershipClauses = [];
    if (userCategories.length > 0) {
      ownershipClauses.push({ categoryId: { $in: userCategories.map((c) => c._id) } });
    }
    if (userProjects.length > 0) {
      ownershipClauses.push({ projectId: { $in: userProjects.map((p) => p._id) } });
    }

    if (ownershipClauses.length === 0) {
      return [];
    }

    const query = ownershipClauses.length === 1 ? ownershipClauses[0] : { $or: ownershipClauses };

    return Task.find(query)
      .populate('categoryId', 'name userId')
      .populate('projectId', 'name userId');
  },
};
```

- [ ] **Step 6: Verify all repository files exist**

```bash
ls -la backend/repositories/
```

- [ ] **Step 7: Commit**

```bash
git add backend/repositories/
git commit -m "feat: add repository layer for all resources (category, user, project, task, stat)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Create categoryService

**Files:**
- Create: `backend/services/categoryService.js`

**Interfaces:**
- Consumes: `categoryRepository` from `../repositories/categoryRepository.js`; `userRepository` from `../repositories/userRepository.js`; `NotFoundError`, `ValidationError`, `ForbiddenError` from `../utils/errors.js`
- Produces: `categoryService` with methods: `create(data, userId)`, `getAll(user)`, `getById(id, user)`, `update(id, data, user)`, `delete(id, user)`
- Task 15 (categoryController) consumes this

- [ ] **Step 1: Write services/categoryService.js**

```js
import { categoryRepository } from '../repositories/categoryRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';

const verifyOwnership = (category, user) => {
  if (user.role === 'ADMIN') return;
  if (category.userId.toString() !== user._id.toString()) {
    throw new ForbiddenError("You don't have permission to access this category");
  }
};

export const categoryService = {
  async create(data, userId) {
    const existing = await categoryRepository.findByUserAndName(userId, data.name);
    if (existing) {
      throw new ValidationError('Category name already exists for this user');
    }

    const category = await categoryRepository.create({ ...data, userId });
    await userRepository.addCategory(userId, category._id);
    return category;
  },

  async getAll(user) {
    if (user.role === 'ADMIN') {
      return categoryRepository.findAll();
    }
    return categoryRepository.findByUser(user._id);
  },

  async getById(id, user) {
    const category = await categoryRepository.findByIdPopulated(id);
    if (!category) throw new NotFoundError('Category not found');
    verifyOwnership(category, user);
    return category;
  },

  async update(id, data, user) {
    const category = await categoryRepository.findById(id);
    if (!category) throw new NotFoundError('Category not found');

    if (category.name === 'Uncategorized') {
      throw new ValidationError("Cannot update the 'Uncategorized' category");
    }

    verifyOwnership(category, user);

    if (Object.keys(data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    return categoryRepository.updateById(id, data);
  },

  async delete(id, user) {
    const category = await categoryRepository.findById(id);
    if (!category) throw new NotFoundError('Category not found');

    if (category.name === 'Uncategorized') {
      throw new ValidationError("Cannot delete the 'Uncategorized' category");
    }

    verifyOwnership(category, user);

    await userRepository.removeCategory(category.userId, id);
    await categoryRepository.deleteById(id);
  },
};
```

- [ ] **Step 2: Verify the file exists and has correct exports**

```bash
node -e "import('./services/categoryService.js').then(m => console.log(Object.keys(m)))" backend/
```

- [ ] **Step 3: Commit**

```bash
git add backend/services/categoryService.js
git commit -m "feat: add categoryService with ownership checks and uncategorized protection

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Create userService

**Files:**
- Create: `backend/services/userService.js`

**Interfaces:**
- Consumes: `userRepository` from `../repositories/userRepository.js`; `NotFoundError` from `../utils/errors.js`
- Produces: `userService` with methods: `create(data)`, `getAll()`, `getById(id)`, `update(id, data)`, `delete(id)`
- Task 15 (userController) consumes this

- [ ] **Step 1: Write services/userService.js**

```js
import { userRepository } from '../repositories/userRepository.js';
import { NotFoundError } from '../utils/errors.js';

export const userService = {
  async create(data) {
    return userRepository.create(data);
  },

  async getAll() {
    return userRepository.findAll();
  },

  async getById(id) {
    const user = await userRepository.findByIdPopulated(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async update(id, data) {
    if (Object.keys(data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const user = await userRepository.updateById(id, data);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async delete(id) {
    const user = await userRepository.deleteById(id);
    if (!user) throw new NotFoundError('User not found');
  },
};
```

Fix: add the missing `ValidationError` import:

Actually, let me correct that — `ValidationError` isn't imported. Let me add it.

- [ ] **Step 1 (corrected): Write services/userService.js**

```js
import { userRepository } from '../repositories/userRepository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export const userService = {
  async create(data) {
    return userRepository.create(data);
  },

  async getAll() {
    return userRepository.findAll();
  },

  async getById(id) {
    const user = await userRepository.findByIdPopulated(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async update(id, data) {
    if (Object.keys(data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const user = await userRepository.updateById(id, data);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async delete(id) {
    const user = await userRepository.deleteById(id);
    if (!user) throw new NotFoundError('User not found');
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/userService.js
git commit -m "feat: add userService for admin user CRUD operations

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Create statService

**Files:**
- Create: `backend/services/statService.js`

**Interfaces:**
- Consumes: `statRepository` from `../repositories/statRepository.js`; `DATE_KEY_PATTERN` from `../constants/datePatterns.js`
- Produces:
  - HTTP-facing: `getStats(user)`, `getCompletedTasksByDate(user, date)`
  - Internal helpers (consumed by taskService): `incrementInProgress(userId)`, `incrementCompleted(userId, categoryId, categoryName)`, `incrementGivenUp(userId, categoryId, categoryName)`, `incrementStart(userId)`, `incrementPending(userId)`, `incrementFinish(userId)`, `incrementGiveUp(userId)`, `incrementRawInProgress(userId)`, `decrementCompleted(userId, categoryId)`, `decrementGivenUp(userId, categoryId)`
- Tasks 11 (projectService) and 12 (taskService) consume the internal helpers

- [ ] **Step 1: Write services/statService.js**

This file is large (~200 lines) because it consolidates all the incremental stat helpers currently in `controllers/statController.js`. Each helper is a thin wrapper around a Stat document update.

```js
import Stat from '../models/Stat.js';
import { statRepository } from '../repositories/statRepository.js';
import { DATE_KEY_PATTERN } from '../constants/datePatterns.js';

const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const ensureStat = async (userId) => {
  let stats = await statRepository.findByUser(userId);
  if (!stats) {
    stats = new Stat({ userId });
    await stats.save();
  }
  return stats;
};

const getTodayDailyStat = (stats) => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  let dailyStat = stats.dailyStats.find(
    (ds) => ds.date.toISOString().split('T')[0] === dateStr
  );

  if (!dailyStat) {
    dailyStat = {
      date: today,
      completedTasks: 0,
      completedOfEachCategory: [],
      givenUpTasks: 0,
      givenUpOfEachCategory: [],
    };
    stats.dailyStats.push(dailyStat);
  }

  return dailyStat;
};

const incrementCategoryCount = (collection, categoryId, categoryName) => {
  const existing = collection.find(
    (c) => c.categoryId && c.categoryId.toString() === categoryId.toString()
  );

  if (existing) {
    existing.count += 1;
  } else {
    collection.push({ categoryId, categoryName, count: 1 });
  }
};

const decrementCategoryCount = (collection, categoryId) => {
  const existing = collection.find(
    (c) => c.categoryId && c.categoryId.toString() === categoryId.toString()
  );

  if (existing) {
    existing.count = Math.max(0, existing.count - 1);
  }
};

const getCategoryStatPayload = (task) => ({
  categoryId: task.categoryId?._id || task.categoryId || null,
  categoryName: task.categoryId?.name || 'Uncategorized',
});

const getTaskCompletionDate = (task) =>
  task.completedAt || task.updatedAt || task.createdAt;

const getEntityPayload = (entity) => {
  if (!entity) return null;
  return { _id: entity._id, name: entity.name };
};

const serializeCompletedTask = (task) => ({
  _id: task._id,
  title: task.title,
  description: task.description,
  completedAt: task.completedAt || null,
  completionDate: getTaskCompletionDate(task),
  dueDate: task.dueDate || null,
  priority: task.priority,
  status: task.status,
  project: getEntityPayload(task.projectId),
  category: getEntityPayload(task.categoryId),
});

// ─── HTTP-facing methods ────────────────────────────────────────

async function rebuildStats(user) {
  const tasks = await statRepository.getTasksByUser(user);
  let stats = await statRepository.findByUser(user);

  if (!stats) {
    stats = new Stat({ userId: user._id });
  }

  stats.totalTasks = tasks.length;
  stats.pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  stats.inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
  stats.completedTasks = tasks.filter((t) => t.status === 'completed').length;
  stats.givenUpTasks = tasks.filter((t) => t.status === 'given-up').length;

  const dailyStatsMap = new Map();

  const ensureDaily = (dateKey) => {
    if (!dailyStatsMap.has(dateKey)) {
      dailyStatsMap.set(dateKey, {
        date: new Date(`${dateKey}T00:00:00.000Z`),
        completedTasks: 0,
        completedOfEachCategory: [],
        givenUpTasks: 0,
        givenUpOfEachCategory: [],
      });
    }
    return dailyStatsMap.get(dateKey);
  };

  tasks.forEach((task) => {
    if (task.status === 'completed') {
      const dateKey = toDateKey(task.completedAt || task.updatedAt || task.createdAt);
      if (dateKey) {
        const ds = ensureDaily(dateKey);
        ds.completedTasks += 1;
        const { categoryId, categoryName } = getCategoryStatPayload(task);
        incrementCategoryCount(ds.completedOfEachCategory, categoryId, categoryName);
      }
    }

    if (task.status === 'given-up') {
      const dateKey = toDateKey(task.updatedAt || task.createdAt);
      if (dateKey) {
        const ds = ensureDaily(dateKey);
        ds.givenUpTasks += 1;
        const { categoryId, categoryName } = getCategoryStatPayload(task);
        incrementCategoryCount(ds.givenUpOfEachCategory, categoryId, categoryName);
      }
    }
  });

  stats.dailyStats = Array.from(dailyStatsMap.values()).sort(
    (a, b) => a.date - b.date
  );

  await stats.save();
  return stats;
}

// ─── Incremental updaters (used by taskService/projectService) ──

const incrementInProgress = async (userId) => {
  const stats = await ensureStat(userId);
  stats.totalTasks += 1;
  stats.inProgressTasks += 1;
  await stats.save();
};

const incrementCompleted = async (userId, categoryId, categoryName) => {
  const stats = await ensureStat(userId);
  stats.completedTasks += 1;
  stats.inProgressTasks = Math.max(0, stats.inProgressTasks - 1);

  const dailyStat = getTodayDailyStat(stats);
  dailyStat.completedTasks += 1;
  incrementCategoryCount(dailyStat.completedOfEachCategory, categoryId, categoryName);

  await stats.save();
};

const incrementGivenUp = async (userId, categoryId, categoryName) => {
  const stats = await ensureStat(userId);
  stats.givenUpTasks += 1;
  stats.inProgressTasks = Math.max(0, stats.inProgressTasks - 1);

  const dailyStat = getTodayDailyStat(stats);
  dailyStat.givenUpTasks += 1;
  incrementCategoryCount(dailyStat.givenUpOfEachCategory, categoryId, categoryName);

  await stats.save();
};

const incrementStart = async (userId) => {
  const stats = await ensureStat(userId);
  stats.inProgressTasks += 1;
  stats.pendingTasks = Math.max(0, stats.pendingTasks - 1);
  await stats.save();
};

const incrementPending = async (userId) => {
  const stats = await ensureStat(userId);
  stats.totalTasks += 1;
  stats.pendingTasks += 1;
  await stats.save();
};

const incrementRawInProgress = async (userId) => {
  const stats = await ensureStat(userId);
  stats.inProgressTasks += 1;
  await stats.save();
};

const incrementFinish = async (userId) => {
  const stats = await ensureStat(userId);
  stats.completedTasks += 1;
  stats.inProgressTasks = Math.max(0, stats.inProgressTasks - 1);
  await stats.save();
};

const incrementGiveUp = async (userId) => {
  const stats = await ensureStat(userId);
  stats.givenUpTasks += 1;
  stats.inProgressTasks = Math.max(0, stats.inProgressTasks - 1);
  await stats.save();
};

const decrementCompleted = async (userId, categoryId) => {
  const stats = await statRepository.findByUser(userId);
  if (!stats) return;

  stats.completedTasks = Math.max(0, stats.completedTasks - 1);

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dailyStat = stats.dailyStats.find(
    (ds) => ds.date.toISOString().split('T')[0] === dateStr
  );

  if (dailyStat) {
    dailyStat.completedTasks = Math.max(0, dailyStat.completedTasks - 1);
    decrementCategoryCount(dailyStat.completedOfEachCategory, categoryId);
  }

  await stats.save();
};

const decrementGivenUp = async (userId, categoryId) => {
  const stats = await statRepository.findByUser(userId);
  if (!stats) return;

  stats.givenUpTasks = Math.max(0, stats.givenUpTasks - 1);

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dailyStat = stats.dailyStats.find(
    (ds) => ds.date.toISOString().split('T')[0] === dateStr
  );

  if (dailyStat) {
    dailyStat.givenUpTasks = Math.max(0, dailyStat.givenUpTasks - 1);
    decrementCategoryCount(dailyStat.givenUpOfEachCategory, categoryId);
  }

  await stats.save();
};

export const statService = {
  // HTTP-facing
  getStats: (user) => rebuildStats(user),

  async getCompletedTasksByDate(user, date) {
    const tasks = await statRepository.getTasksByUser(user);
    return tasks
      .filter((task) => task.status === 'completed' && toDateKey(getTaskCompletionDate(task)) === date)
      .sort((a, b) => new Date(getTaskCompletionDate(a)) - new Date(getTaskCompletionDate(b)))
      .map(serializeCompletedTask);
  },

  // Internal helpers
  incrementInProgress,
  incrementCompleted,
  incrementGivenUp,
  incrementStart,
  incrementPending,
  incrementRawInProgress,
  incrementFinish,
  incrementGiveUp,
  decrementCompleted,
  decrementGivenUp,
};
```

- [ ] **Step 2: Verify the file exists**

```bash
wc -l backend/services/statService.js
```

- [ ] **Step 3: Commit**

```bash
git add backend/services/statService.js
git commit -m "feat: add statService with rebuildStats, incremental updaters, and completed-tasks-by-date

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Create projectService

**Files:**
- Create: `backend/services/projectService.js`

**Interfaces:**
- Consumes: `projectRepository` from `../repositories/projectRepository.js`; `taskRepository` from `../repositories/taskRepository.js`; `NotFoundError`, `ValidationError`, `ForbiddenError` from `../utils/errors.js`; `PROJECT_STATUSES` from `../constants/projectStatus.js`; `FINISHED_STATUSES` from `../constants/taskStatus.js`
- Produces: `projectService` with methods: `create(data, userId)`, `getAll(user)`, `getById(id, user)`, `update(id, data, user)`, `delete(id, user)`, `getProjectTasks(id, user)`
- Task 15 (projectController) consumes this

- [ ] **Step 1: Write services/projectService.js**

```js
import { projectRepository } from '../repositories/projectRepository.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { PROJECT_STATUSES } from '../constants/projectStatus.js';
import { FINISHED_STATUSES } from '../constants/taskStatus.js';

const createEmptySummary = () => ({
  totalTasks: 0,
  finishedTasks: 0,
  pendingTasks: 0,
  inProgressTasks: 0,
  completedTasks: 0,
  givenUpTasks: 0,
  scheduledTasks: 0,
  canComplete: false,
  completionRate: 0,
});

const addCompletionRate = (summary) => {
  const { _id, ...rest } = summary;
  const total = rest.totalTasks || 0;
  const finished = (rest.completedTasks || 0) + (rest.givenUpTasks || 0);
  return {
    ...rest,
    finishedTasks: finished,
    canComplete: total > 0 && finished === total,
    completionRate: total > 0 ? Math.round((rest.completedTasks / total) * 100) : 0,
  };
};

const computeSummaryMap = async (projectIds) => {
  if (projectIds.length === 0) return new Map();

  const summaries = await taskRepository.aggregate([
    { $match: { projectId: { $in: projectIds } } },
    {
      $group: {
        _id: '$projectId',
        totalTasks: { $sum: 1 },
        pendingTasks: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        inProgressTasks: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
        completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        givenUpTasks: { $sum: { $cond: [{ $eq: ['$status', 'given-up'] }, 1, 0] } },
        scheduledTasks: { $sum: { $cond: [{ $ifNull: ['$dueDate', false] }, 1, 0] } },
      },
    },
  ]);

  return new Map(
    summaries.map((s) => [s._id.toString(), addCompletionRate(s)])
  );
};

const getSingleSummary = async (projectId) => {
  const map = await computeSummaryMap([projectId]);
  return map.get(projectId.toString()) || createEmptySummary();
};

const withSummary = (project, summary) => ({
  ...project.toObject(),
  summary,
});

const getOwnerId = (project) =>
  project.userId?._id?.toString?.() || project.userId?.toString?.() || null;

const canAccess = (project, user) =>
  user.role === 'ADMIN' || getOwnerId(project) === user._id.toString();

const normalizeColor = (color) => {
  if (color === undefined) return { value: undefined };
  if (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color.trim())) {
    return { error: 'Project color must be a six-digit hex color' };
  }
  return { value: color.trim().toUpperCase() };
};

const getCompletionEligibility = async (projectId) => {
  const summary = await taskRepository.aggregate([
    { $match: { projectId } },
    {
      $group: {
        _id: '$projectId',
        totalTasks: { $sum: 1 },
        unfinishedTasks: {
          $sum: { $cond: [{ $in: ['$status', FINISHED_STATUSES] }, 0, 1] },
        },
      },
    },
  ]);

  const result = summary[0] || { totalTasks: 0, unfinishedTasks: 0 };
  return result.totalTasks > 0 && result.unfinishedTasks === 0;
};

export const projectService = {
  async create(data, userId) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      throw new ValidationError('Name is required');
    }

    const normalizedColor = normalizeColor(data.color);
    if (normalizedColor.error) throw new ValidationError(normalizedColor.error);

    const existing = await projectRepository.findByUserAndName(userId, data.name.trim());
    if (existing) throw new ValidationError('Project name already exists for this user');

    const project = await projectRepository.create({
      userId,
      name: data.name.trim(),
      description: data.description,
      color: normalizedColor.value,
    });

    return withSummary(project, createEmptySummary());
  },

  async getAll(user) {
    const projects = user.role === 'ADMIN'
      ? await projectRepository.findAllPopulated()
      : await projectRepository.findByUserPopulated(user._id);

    const summaryMap = await computeSummaryMap(projects.map((p) => p._id));

    return projects.map((project) =>
      withSummary(project, summaryMap.get(project._id.toString()) || createEmptySummary())
    );
  },

  async getById(id, user) {
    const project = await projectRepository.findByIdPopulated(id);
    if (!project) throw new NotFoundError('Project not found');
    if (!canAccess(project, user)) throw new ForbiddenError("You don't have permission to access this project");

    const summary = await getSingleSummary(project._id);
    return withSummary(project, summary);
  },

  async update(id, data, user) {
    const project = await projectRepository.findById(id);
    if (!project) throw new NotFoundError('Project not found');
    if (!canAccess(project, user)) throw new ForbiddenError("You don't have permission to update this project");

    const update = {};

    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim()) {
        throw new ValidationError('Project name cannot be empty');
      }
      update.name = data.name.trim();
    }

    if (data.description !== undefined) update.description = data.description;

    const normalizedColor = normalizeColor(data.color);
    if (normalizedColor.error) throw new ValidationError(normalizedColor.error);
    if (normalizedColor.value !== undefined) update.color = normalizedColor.value;

    if (data.status !== undefined) {
      if (!PROJECT_STATUSES.includes(data.status)) throw new ValidationError('Invalid project status');

      if (data.status === 'completed') {
        const eligible = await getCompletionEligibility(project._id);
        if (!eligible) {
          throw new ValidationError(
            'Project can only be completed when it has at least one task and every task is completed or given up'
          );
        }
      }

      update.status = data.status;
    }

    if (Object.keys(update).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const updated = await projectRepository.updateByIdPopulated(id, update);
    const summary = await getSingleSummary(updated._id);
    return withSummary(updated, summary);
  },

  async delete(id, user) {
    const project = await projectRepository.findById(id);
    if (!project) throw new NotFoundError('Project not found');
    if (!canAccess(project, user)) throw new ForbiddenError("You don't have permission to delete this project");

    await projectRepository.deleteById(id);
  },

  async getProjectTasks(id, user) {
    const project = await projectRepository.findByIdPopulated(id);
    if (!project) throw new NotFoundError('Project not found');
    if (!canAccess(project, user)) throw new ForbiddenError("You don't have permission to access this project");

    const tasks = await taskRepository.findPopulated(
      { projectId: project._id },
      { sort: { dueDate: 1, createdAt: -1 } }
    );

    const summary = await getSingleSummary(project._id);

    return { project: withSummary(project, summary), summary, tasks };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/projectService.js
git commit -m "feat: add projectService with summary computation, completion eligibility, and color validation

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Create taskService

**Files:**
- Create: `backend/services/taskService.js`

**Interfaces:**
- Consumes: `taskRepository`, `categoryRepository`, `projectRepository`; `statService` from `./statService.js`; `normalizeTaskDateInput` from `../utils/dateTime.js`; `NotFoundError`, `ValidationError`, `ForbiddenError` from `../utils/errors.js`; `TASK_STATUSES` from `../constants/taskStatus.js`
- Produces: `taskService` with methods: `create(data, userId)`, `getAll(user, queryParams)`, `getById(id, user)`, `update(id, data, user)`, `finish(id, user)`, `start(id, user)`, `giveUp(id, user)`, `delete(id, user)`, `getTodayDeadlines(user)`, `getByStatus(user, status)`, `getByCategory(user, categoryId)`
- Task 15 (taskController) consumes this

- [ ] **Step 1: Write services/taskService.js**

This is the largest service (~230 lines) since taskController was the fattest controller (540 lines). All private helpers become module-level functions.

```js
import { taskRepository } from '../repositories/taskRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { statService } from './statService.js';
import { normalizeTaskDateInput } from '../utils/dateTime.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { TASK_STATUSES } from '../constants/taskStatus.js';

// ─── Private helpers ────────────────────────────────────────────

const resolveCategory = async (categoryId, userId) => {
  if (categoryId) {
    const category = await categoryRepository.findById(categoryId);
    if (!category || category.userId.toString() !== userId.toString()) {
      throw new ValidationError('Invalid categoryId');
    }
    return categoryId;
  }

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

const buildTaskAccessQuery = async (user) => {
  if (user.role === 'ADMIN') return {};

  const [userCategories, userProjects] = await Promise.all([
    categoryRepository.findByUser(user._id),
    projectRepository.findByUser(user._id),
  ]);

  const clauses = [];
  if (userCategories.length > 0) {
    clauses.push({ categoryId: { $in: userCategories.map((c) => c._id) } });
  }
  if (userProjects.length > 0) {
    clauses.push({ projectId: { $in: userProjects.map((p) => p._id) } });
  }

  if (clauses.length === 0) return { _id: { $in: [] } };
  if (clauses.length === 1) return clauses[0];
  return { $or: clauses };
};

const parseDateRangeQuery = (queryParams) => {
  const { startDate, endDate } = queryParams;
  if (startDate === undefined && endDate === undefined) return {};

  if (!startDate || !endDate) {
    return { error: 'Both startDate and endDate are required for date range filtering' };
  }

  const parsedStart = new Date(startDate);
  const parsedEnd = new Date(endDate);

  if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
    return { error: 'Invalid date range' };
  }

  if (parsedStart > parsedEnd) {
    return { error: 'startDate must be before or equal to endDate' };
  }

  return { filter: { dueDate: { $gte: parsedStart, $lte: parsedEnd } } };
};

const applyCompletionTimestamp = (update, currentStatus) => {
  if (update.status === undefined) return;

  if (update.status === 'completed') {
    if (currentStatus !== 'completed') {
      update.completedAt = new Date();
    }
  } else if (currentStatus === 'completed') {
    update.completedAt = null;
  }
};

const getOwnerId = (task) => {
  const categoryOwner = task.categoryId?.userId?._id?.toString?.()
    || task.categoryId?.userId?.toString?.();
  if (categoryOwner) return categoryOwner;
  return task.projectId?.userId?._id?.toString?.()
    || task.projectId?.userId?.toString?.()
    || null;
};

const verifyOwnership = (task, user) => {
  if (user.role === 'ADMIN') return;
  if (getOwnerId(task) !== user._id.toString()) {
    throw new ForbiddenError("You don't have permission to access this task");
  }
};

// ─── Public service ─────────────────────────────────────────────

export const taskService = {
  async create(data, userId) {
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

  async getAll(user, queryParams) {
    const query = await buildTaskAccessQuery(user);
    const dateRange = parseDateRangeQuery(queryParams);
    if (dateRange.error) throw new ValidationError(dateRange.error);

    return taskRepository.findPopulated({
      ...query,
      ...(dateRange.filter || {}),
    });
  },

  async getById(id, user) {
    const task = await taskRepository.findByIdPopulated(id);
    if (!task) throw new NotFoundError('Task not found');
    verifyOwnership(task, user);
    return task;
  },

  async update(id, data, user) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('Task not found');
    verifyOwnership(task, user);

    const update = {};

    if (data.title !== undefined) update.title = data.title;
    if (data.description !== undefined) update.description = data.description;

    if (data.status !== undefined) {
      if (!TASK_STATUSES.includes(data.status)) throw new ValidationError('Invalid status');
      update.status = data.status;
    }

    if (data.priority !== undefined) update.priority = data.priority;

    if (data.categoryId !== undefined) {
      if (data.categoryId === 'uncategorized' || data.categoryId === '' || data.categoryId === null) {
        const uncategorized = await categoryRepository.findByUserAndName(user._id, 'Uncategorized');
        if (!uncategorized) throw new ValidationError('Uncategorized category not found');
        update.categoryId = uncategorized._id;
      } else {
        const newCategory = await categoryRepository.findById(data.categoryId);
        if (!newCategory || newCategory.userId.toString() !== user._id.toString()) {
          throw new ValidationError('Invalid categoryId');
        }
        update.categoryId = data.categoryId;
      }
    }

    const currentProjectId = task.projectId?._id || task.projectId || null;
    const projectUpdate = await resolveProject(data.projectId, user._id, currentProjectId);
    if (projectUpdate.error) throw new ValidationError(projectUpdate.error);
    if (projectUpdate.shouldUpdate) update.projectId = projectUpdate.value;

    const startDate = normalizeTaskDateInput(data.startDate);
    const dueDate = normalizeTaskDateInput(data.dueDate);
    if (startDate.error || dueDate.error) {
      throw new ValidationError(startDate.error || dueDate.error);
    }
    if (startDate.shouldUpdate) update.startDate = startDate.value;
    if (dueDate.shouldUpdate) update.dueDate = dueDate.value;

    applyCompletionTimestamp(update, task.status);

    if (Object.keys(update).length === 0) {
      throw new ValidationError('No fields to update');
    }

    return taskRepository.updateByIdPopulated(id, update);
  },

  async finish(id, user) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('Task not found');
    verifyOwnership(task, user);

    if (task.status === 'completed') throw new ValidationError('Task is already completed');

    const currentDate = new Date();
    task.status = 'completed';
    task.completedAt = currentDate;
    task.isOverDue = task.dueDate && currentDate > task.dueDate;
    await task.save();

    const categoryName = task.categoryId?.name
      || (await categoryRepository.findById(task.categoryId?._id))?.name;

    if (task.categoryId?._id && categoryName) {
      await statService.incrementCompleted(user._id, task.categoryId._id, categoryName);
    }

    return taskRepository.findByIdPopulated(id);
  },

  async start(id, user) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('Task not found');
    verifyOwnership(task, user);

    if (task.status !== 'pending') throw new ValidationError('Only pending tasks can be started');

    task.status = 'in-progress';
    await task.save();

    await statService.incrementStart(user._id);
    return taskRepository.findByIdPopulated(id);
  },

  async giveUp(id, user) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('Task not found');
    verifyOwnership(task, user);

    if (task.status !== 'in-progress') throw new ValidationError('Only in-progress tasks can be given up');

    task.status = 'given-up';
    await task.save();

    const categoryName = task.categoryId?.name
      || (await categoryRepository.findById(task.categoryId?._id))?.name;

    if (task.categoryId?._id && categoryName) {
      await statService.incrementGivenUp(user._id, task.categoryId._id, categoryName);
    }

    return taskRepository.findByIdPopulated(id);
  },

  async delete(id, user) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('Task not found');
    verifyOwnership(task, user);

    await taskRepository.deleteById(id);
  },

  async getTodayDeadlines(user) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setHours(23, 59, 59, 999);

    const baseQuery = await buildTaskAccessQuery(user);

    return taskRepository.findPopulated({
      ...baseQuery,
      dueDate: { $gte: startOfDay, $lt: endOfDay },
      status: { $nin: ['completed', 'given-up'] },
    });
  },

  async getByStatus(user, status) {
    const baseQuery = await buildTaskAccessQuery(user);
    return taskRepository.findPopulated({ ...baseQuery, status });
  },

  async getByCategory(user, categoryId) {
    const baseQuery = await buildTaskAccessQuery(user);
    return taskRepository.findPopulated({ ...baseQuery, categoryId });
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/taskService.js
git commit -m "feat: add taskService with ownership checks, status transitions, and date parsing

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: Create authService

**Files:**
- Create: `backend/services/authService.js`

**Interfaces:**
- Consumes: `userRepository` from `../repositories/userRepository.js`; `ValidationError`, `UnauthorizedError`, `NotFoundError` from `../utils/errors.js`; `jsonwebtoken`
- Produces: `authService` with methods: `register(data)`, `login(email, password)`, `getMe(userId)`, `changePassword(userId, currentPassword, newPassword)`, `updateInfo(userId, data)`, `selfDelete(userId)`
- Note: `generateToken.js` logic is inlined here as a module-level `generateToken(id)` function
- Task 15 (authController) consumes this

- [ ] **Step 1: Write services/authService.js**

```js
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

export const authService = {
  async register(data) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new ValidationError('Email already exists');

    const user = await userRepository.create({
      email: data.email,
      password: data.password,
      name: data.name,
      dob: data.dob,
      nationality: data.nationality || 'Vietnam',
      role: 'USER',
    });

    const token = generateToken(user._id);
    user.password = undefined;

    return { user, token };
  },

  async login(email, password) {
    const user = await userRepository.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new UnauthorizedError('Invalid email or password');

    const token = generateToken(user._id);
    user.password = undefined;

    return { user, token };
  },

  async getMe(userId) {
    const user = await userRepository.findByIdPopulated(userId);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw new NotFoundError('User not found');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new UnauthorizedError('Current password is incorrect');

    const isSame = await user.comparePassword(newPassword);
    if (isSame) throw new ValidationError('New password must be different from the current password');

    user.password = newPassword;
    await user.save();
  },

  async updateInfo(userId, data) {
    if (Object.keys(data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const user = await userRepository.updateById(userId, data);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async selfDelete(userId) {
    const user = await userRepository.deleteById(userId);
    if (!user) throw new NotFoundError('User not found');
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/authService.js
git commit -m "feat: add authService with register, login, password change, and token generation

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 14: Create aiService

**Files:**
- Create: `backend/services/aiService.js`

**Interfaces:**
- Consumes: `getAiClient` from `../libs/aiClient.js`; `getAiModel` from `../config/env.js`; `categoryRepository` from `../repositories/categoryRepository.js`; `taskRepository` from `../repositories/taskRepository.js`; `statService` from `./statService.js`; `normalizeTaskDateInput` from `../utils/dateTime.js`; `z` from `zod`
- Produces: `aiService` with methods: `generateTasks(userRequirement, userId)`, `chatResponse(userInput)`
- Task 15 (aiController) consumes this

- [ ] **Step 1: Write services/aiService.js**

```js
import { z } from 'zod';
import { getAiClient } from '../libs/aiClient.js';
import { getAiModel } from '../config/env.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { statService } from './statService.js';
import { normalizeTaskDateInput } from '../utils/dateTime.js';
import { ValidationError } from '../utils/errors.js';

export const aiService = {
  async generateTasks(userRequirement, userId) {
    const ai = getAiClient();
    const categories = await categoryRepository.findByUser(userId);

    const categoryMap = {};
    categories.forEach((c) => {
      categoryMap[c.name] = c._id.toString();
    });

    const taskSchema = z.object({
      title: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      priority: z.enum(['Low', 'Medium', 'High']).optional(),
      categoryName: z.string().optional().nullable(),
      dueDate: z.string().optional(),
    });

    const tasksArraySchema = z.array(taskSchema).length(3);

    const today = new Date().toISOString().split('T')[0];
    const prompt = `Generate EXACTLY 3 tasks (as an array) based on the following user requirement: "${userRequirement}".

Available categories (choose ONE of these EXACT names for each task or pick the "Uncategorized" category if none fit):
${categories.map((c) => `- "${c.name}"`).join('\n')}

IMPORTANT:
- Return an ARRAY of EXACTLY 3 TASK OBJECTS
- For categoryName, you MUST use the EXACT category name from the list above (case-sensitive)
- Do NOT make up new category names. If uncertain, use null
- Make each task unique and actionable

Create 3 practical, actionable tasks with:
- title: brief and clear
- description: detailed explanation
- priority: Low, Medium, or High
- categoryName: one of the exact names listed above, or null
- dueDate: YYYY-MM-DD format if applicable (based on today: ${today})`;

    const model = getAiModel();
    if (!model) throw new Error('Missing required environment variable: AI_MODEL_NAME');

    const rawSchema = tasksArraySchema.toJSONSchema();
    const { $schema, ...jsonSchema } = rawSchema;

    const response = await ai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You must respond with a JSON array of exactly 3 task objects. Follow this JSON Schema:\n${JSON.stringify(jsonSchema, null, 2)}`,
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');

    const generatedTasks = tasksArraySchema.parse(JSON.parse(content));

    const savedTasks = [];

    for (const generatedTask of generatedTasks) {
      let categoryId = null;
      if (generatedTask.categoryName) {
        if (categoryMap[generatedTask.categoryName]) {
          categoryId = categoryMap[generatedTask.categoryName];
        } else {
          const lower = generatedTask.categoryName.toLowerCase();
          const matched = categories.find((c) => c.name.toLowerCase() === lower);
          if (matched) {
            categoryId = matched._id.toString();
          } else if (categoryMap['Uncategorized']) {
            categoryId = categoryMap['Uncategorized'];
          }
        }
      }

      const dueDateUpdate = normalizeTaskDateInput(generatedTask.dueDate);
      if (dueDateUpdate.error) continue;

      const task = await taskRepository.create({
        title: generatedTask.title,
        description: generatedTask.description || '',
        priority: generatedTask.priority || 'Medium',
        status: 'pending',
        categoryId,
        dueDate: dueDateUpdate.shouldUpdate ? dueDateUpdate.value : undefined,
      });

      savedTasks.push(task);
      await statService.incrementPending(userId);
    }

    return savedTasks;
  },

  async chatResponse(userInput) {
    const ai = getAiClient();

    const sysInstruction = `You are a helpful assistant for a TodoApp your name is Đạt.
Help users manage tasks, provide productivity tips,
and answer questions about task organization, categories, priorities, and time management.
If user want to auto generate tasks, advise them to use the task generation mode.
Provide short, clear, concise, and friendly responses.`;

    const model = getAiModel();
    if (!model) throw new Error('Missing required environment variable: AI_MODEL_NAME');

    const response = await ai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: sysInstruction },
        { role: 'user', content: userInput },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');

    return content;
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/aiService.js
git commit -m "feat: add aiService with task generation and chat response

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 15: Rewrite all controllers (thin HTTP handlers)

**Files:**
- Rewrite: `backend/controllers/categoryController.js`
- Rewrite: `backend/controllers/userController.js`
- Rewrite: `backend/controllers/statController.js`
- Rewrite: `backend/controllers/projectController.js`
- Rewrite: `backend/controllers/taskController.js`
- Rewrite: `backend/controllers/authController.js`
- Rewrite: `backend/controllers/aiController.js`

**Interfaces:**
- Each controller imports its corresponding service
- Each method: `try { result = await service.method(...); res.status(code).json(result); } catch (error) { next(error); }`
- No business logic, no DB calls, no validation

- [ ] **Step 1: Rewrite controllers/categoryController.js**

```js
import { categoryService } from '../services/categoryService.js';

export const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.create(req.validatedBody, req.user._id);
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    next(error);
  }
};

export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAll(req.user);
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getById(req.params.id, req.user);
    res.status(200).json(category);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.update(req.params.id, req.validatedBody, req.user);
    res.status(200).json({ message: 'Category updated successfully', category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    await categoryService.delete(req.params.id, req.user);
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2: Rewrite controllers/userController.js**

```js
import { userService } from '../services/userService.js';

export const createUser = async (req, res, next) => {
  try {
    const user = await userService.create(req.validatedBody);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAll();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await userService.update(req.params.id, req.validatedBody);
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await userService.delete(req.params.id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await userService.update(req.params.id, { avatarUrl });
    res.status(200).json({ message: 'Avatar uploaded successfully', avatarUrl });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 3: Rewrite controllers/statController.js**

```js
import { statService } from '../services/statService.js';

export const getStats = async (req, res, next) => {
  try {
    const stats = await statService.getStats(req.user);
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

export const getCompletedTasksByDate = async (req, res, next) => {
  try {
    const tasks = await statService.getCompletedTasksByDate(req.user, req.query.date);
    res.status(200).json({ date: req.query.date, tasks });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 4: Rewrite controllers/projectController.js**

```js
import { projectService } from '../services/projectService.js';

export const createProject = async (req, res, next) => {
  try {
    const project = await projectService.create(req.validatedBody, req.user._id);
    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    next(error);
  }
};

export const getAllProjects = async (req, res, next) => {
  try {
    const projects = await projectService.getAll(req.user);
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const project = await projectService.getById(req.params.id, req.user);
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await projectService.update(req.params.id, req.validatedBody, req.user);
    res.status(200).json({ message: 'Project updated successfully', project });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    await projectService.delete(req.params.id, req.user);
    res.status(200).json({
      message: 'Project deleted successfully. Related tasks were kept and unassigned from the project.',
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectTasks = async (req, res, next) => {
  try {
    const result = await projectService.getProjectTasks(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 5: Rewrite controllers/taskController.js**

```js
import { taskService } from '../services/taskService.js';

export const createTask = async (req, res, next) => {
  try {
    const task = await taskService.create(req.validatedBody, req.user._id);
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    next(error);
  }
};

export const getAllTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getAll(req.user, req.query);
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const task = await taskService.getById(req.params.id, req.user);
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = await taskService.update(req.params.id, req.validatedBody, req.user);
    res.status(200).json({ message: 'Task updated successfully', task });
  } catch (error) {
    next(error);
  }
};

export const finishTask = async (req, res, next) => {
  try {
    const task = await taskService.finish(req.params.id, req.user);
    res.status(200).json({ message: 'Task marked as completed', task });
  } catch (error) {
    next(error);
  }
};

export const startTask = async (req, res, next) => {
  try {
    const task = await taskService.start(req.params.id, req.user);
    res.status(200).json({ message: 'Task started successfully', task });
  } catch (error) {
    next(error);
  }
};

export const giveUpTask = async (req, res, next) => {
  try {
    const task = await taskService.giveUp(req.params.id, req.user);
    res.status(200).json({ message: 'Task marked as given-up', task });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    await taskService.delete(req.params.id, req.user);
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getTodayDeadlines = async (req, res, next) => {
  try {
    const tasks = await taskService.getTodayDeadlines(req.user);
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskByStatus = async (req, res, next) => {
  try {
    const tasks = await taskService.getByStatus(req.user, req.params.status);
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskByCategory = async (req, res, next) => {
  try {
    const tasks = await taskService.getByCategory(req.user, req.params.categoryId);
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 6: Rewrite controllers/authController.js**

```js
import { authService } from '../services/authService.js';

export const registerUser = async (req, res, next) => {
  try {
    const { user, token } = await authService.register(req.validatedBody);
    res.status(201).json({ message: 'Registration successful', user, token });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { user, token } = await authService.login(req.validatedBody.email, req.validatedBody.password);
    res.status(200).json({ message: 'Login successful', user, token });
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (req, res) => {
  res.status(200).json({ message: 'Logout successful' });
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user._id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(
      req.user._id,
      req.validatedBody.currentPassword,
      req.validatedBody.newPassword,
    );
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateInfo = async (req, res, next) => {
  try {
    const user = await authService.updateInfo(req.user._id, req.body);
    res.status(200).json({ message: 'User info updated successfully', user });
  } catch (error) {
    next(error);
  }
};

export const selfDelete = async (req, res, next) => {
  try {
    await authService.selfDelete(req.user._id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 7: Rewrite controllers/aiController.js**

```js
import { aiService } from '../services/aiService.js';

export const generateTasksWithRequirement = async (req, res, next) => {
  try {
    const tasks = await aiService.generateTasks(req.validatedBody.userRequirement, req.user._id);
    res.status(201).json({
      success: true,
      message: '3 tasks generated successfully',
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

export const responseToUser = async (req, res, next) => {
  try {
    const content = await aiService.chatResponse(req.validatedBody.userInput);
    res.status(200).json({
      success: true,
      message: 'Response generated successfully',
      data: content,
    });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 8: Commit**

```bash
git add backend/controllers/
git commit -m "refactor: rewrite all controllers as thin HTTP handlers delegating to services

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 16: Update all routes with validate middleware

**Files:**
- Modify: `backend/routes/taskRoute.js`
- Modify: `backend/routes/authRoute.js`
- Modify: `backend/routes/categoryRoute.js`
- Modify: `backend/routes/projectRoute.js`
- Modify: `backend/routes/userRoute.js`
- Modify: `backend/routes/aiRoutes.js`
- Modify: `backend/routes/statRoute.js`

**Interfaces:**
- Consumes: `validate` from `../middlewares/validate.js`; Zod schemas from `../validations/`
- Each route file adds `validate(schema)` after `protect` on POST/PUT routes
- GET/DELETE routes remain unchanged

- [ ] **Step 1: Update routes/categoryRoute.js**

```js
import express from 'express';
import { createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createCategorySchema, updateCategorySchema } from '../validations/categoryValidation.js';

const router = express.Router();

router.post('/', protect, validate(createCategorySchema), createCategory);
router.get('/', protect, getAllCategories);
router.get('/:id', protect, getCategoryById);
router.put('/:id', protect, validate(updateCategorySchema), updateCategory);
router.delete('/:id', protect, deleteCategory);

export default router;
```

- [ ] **Step 2: Update routes/projectRoute.js**

```js
import express from 'express';
import { createProject, deleteProject, getAllProjects, getProjectById, getProjectTasks, updateProject } from '../controllers/projectController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createProjectSchema, updateProjectSchema } from '../validations/projectValidation.js';

const router = express.Router();

router.post('/', protect, validate(createProjectSchema), createProject);
router.get('/', protect, getAllProjects);
router.get('/:id/tasks', protect, getProjectTasks);
router.get('/:id', protect, getProjectById);
router.put('/:id', protect, validate(updateProjectSchema), updateProject);
router.delete('/:id', protect, deleteProject);

export default router;
```

- [ ] **Step 3: Update routes/taskRoute.js**

```js
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

- [ ] **Step 4: Update routes/authRoute.js**

```js
import express from 'express';
import { registerUser, loginUser, getMe, changePassword, updateInfo, logoutUser, selfDelete } from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { registerSchema, loginSchema, changePasswordSchema } from '../validations/authValidation.js';

const router = express.Router();

router.post('/logout', logoutUser);
router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.get('/me', protect, getMe);
router.put('/change-password', protect, validate(changePasswordSchema), changePassword);
router.put('/update-info', protect, updateInfo);
router.delete('/self-delete', protect, selfDelete);

export default router;
```

- [ ] **Step 5: Update routes/userRoute.js**

```js
import express from 'express';
import { createUser, getAllUsers, getUserById, updateUser, deleteUser, uploadAvatar } from '../controllers/userController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createUserSchema, updateUserSchema } from '../validations/userValidation.js';

const router = express.Router();

router.post('/', protect, authorize('ADMIN'), validate(createUserSchema), createUser);
router.get('/', protect, authorize('ADMIN'), getAllUsers);
router.get('/:id', protect, authorize('ADMIN'), getUserById);
router.put('/:id', protect, authorize('ADMIN'), validate(updateUserSchema), updateUser);
router.delete('/:id', protect, authorize('ADMIN'), deleteUser);

export default router;
```

Note: `uploadAvatar` route is removed from this rewrite — the current `userRoute.js` doesn't have one; if needed, add separately.

Wait — let me check the current userRoute.js. Actually, I read it earlier and it doesn't have an uploadAvatar route. The userController exports it but it may be unused or mounted elsewhere. I'll keep the route file minimal and not add it.

Also let me check — the current userRoute.js actually... let me verify. I read it earlier. It has:
- POST / (protect, authorize ADMIN, createUser)
- GET / (protect, authorize ADMIN, getAllUsers)
- GET /:id (protect, authorize ADMIN, getUserById)
- PUT /:id (protect, authorize ADMIN, updateUser)
- DELETE /:id (protect, authorize ADMIN, deleteUser)

Good, that matches.

- [ ] **Step 6: Update routes/aiRoutes.js**

```js
import express from 'express';
import { generateTasksWithRequirement, responseToUser } from '../controllers/aiController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { generateTasksSchema, chatSchema } from '../validations/aiValidation.js';

const router = express.Router();

router.post('/generate-tasks', protect, validate(generateTasksSchema), generateTasksWithRequirement);
router.post('/chat', protect, validate(chatSchema), responseToUser);

export default router;
```

- [ ] **Step 7: Update routes/statRoute.js**

```js
import express from 'express';
import { getStats, getCompletedTasksByDate } from '../controllers/statController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', protect, getStats);
router.get('/completed-tasks', protect, getCompletedTasksByDate);

export default router;
```

- [ ] **Step 8: Commit**

```bash
git add backend/routes/
git commit -m "feat: add Zod validate middleware to all POST/PUT routes

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 17: Create app.js + server.js, delete old index.js

**Files:**
- Create: `backend/app.js`
- Create: `backend/server.js`
- Delete: `backend/index.js`

**Interfaces:**
- `app.js` exports `app` (Express instance) and `ensureAppReady` (for Vercel)
- `server.js` imports `app`, validates env, connects DB, calls `app.listen()`
- Vercel compatibility: `server.js` guards `app.listen()` behind `!process.env.VERCEL`

- [ ] **Step 1: Write app.js**

```js
import express from 'express';
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

app.get('/healthz', async (req, res, next) => {
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

app.get('/', (req, res) => {
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
```

- [ ] **Step 2: Write server.js**

```js
import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import { getServerConfig, validateServerEnv } from './config/env.js';

const { host, port } = getServerConfig();

if (!process.env.VERCEL) {
  const start = async () => {
    validateServerEnv();
    await connectDB();
    app.listen(port, host, () => {
      console.log(`Server is running on http://${host}:${port}`);
    });
  };

  start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
```

- [ ] **Step 3: Remove old index.js**

```bash
rm backend/index.js
```

- [ ] **Step 4: Update package.json main/scripts if needed**

Check `package.json` for any reference to `index.js`:

```bash
grep -n 'index.js' backend/package.json
```

If `"main": "index.js"` exists, update to `"main": "server.js"`. Also check if `"start"` script references `index.js`:

If start is `node index.js`, update to `node server.js`. If using nodemon, update `"dev"` script too.

- [ ] **Step 5: Verify the app boots**

```bash
cd backend && node -e "
import('./app.js').then(m => {
  console.log('app.js exports:', Object.keys(m));
  process.exit(0);
}).catch(e => {
  console.error(e.message);
  process.exit(1);
})
"
```

Expected: `app.js exports: [ 'default', 'ensureAppReady' ]`

- [ ] **Step 6: Commit**

```bash
git add backend/app.js backend/server.js backend/package.json
git rm backend/index.js
git commit -m "refactor: split index.js into app.js + server.js, add errorHandler middleware

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 18: Cleanup and final verification

**Files:**
- Delete: `backend/utils/generateToken.js` (merged into authService)
- Modify: `backend/utils/dateTime.js` (remove date patterns, import from constants instead — actually keep them, the patterns are still used by dateTime.js itself)

**Verification:**
- Check for any remaining imports from old paths
- Confirm all route handlers work

- [ ] **Step 1: Delete utils/generateToken.js**

```bash
rm backend/utils/generateToken.js
```

- [ ] **Step 2: Verify no stale imports remain**

```bash
cd backend && grep -rn "from.*\.\./model/" --include="*.js" . || echo "No stale model/ imports found"
cd backend && grep -rn "from.*\.\./middleware/" --include="*.js" . | grep -v node_modules || echo "No stale middleware/ imports found"
cd backend && grep -rn "from.*\.\./controller/" --include="*.js" . | grep -v node_modules || echo "No stale controller/ imports found"
cd backend && grep -rn "from.*\.\./route/" --include="*.js" . | grep -v node_modules || echo "No stale route/ imports found"
cd backend && grep -rn "generateToken" --include="*.js" . | grep -v node_modules | grep -v authService || echo "No stale generateToken references"
```

- [ ] **Step 3: Verify all statController imports are updated**

The old coupling where `taskController.js` imported from `statController.js` must be gone:

```bash
grep -rn "from.*statController" backend/controllers/taskController.js || echo "No stale statController import in taskController"
```

- [ ] **Step 4: Verify all new directories exist with expected files**

```bash
echo "=== Directory structure ==="
find backend -type f -name "*.js" -not -path "*/node_modules/*" -not -path "*/.vercel/*" | sort
echo ""
echo "=== File counts ==="
echo "constants:  $(ls backend/constants/*.js | wc -l)"
echo "validations: $(ls backend/validations/*.js | wc -l)"
echo "repositories: $(ls backend/repositories/*.js | wc -l)"
echo "services:  $(ls backend/services/*.js | wc -l)"
echo "controllers: $(ls backend/controllers/*.js | wc -l)"
echo "routes:    $(ls backend/routes/*.js | wc -l)"
echo "middlewares: $(ls backend/middlewares/*.js | wc -l)"
echo "models:    $(ls backend/models/*.js | wc -l)"
```

Expected minimum counts: constants 4, validations 6, repositories 5, services 7, controllers 7, routes 7, middlewares 3, models 5, + libs/aiClient.js

- [ ] **Step 5: Try a full app import check**

```bash
cd backend && node -e "
import('./app.js').then(() => {
  console.log('All imports resolved successfully');
  process.exit(0);
}).catch(e => {
  console.error('Import error:', e.message);
  process.exit(1);
})
"
```

Expected: "All imports resolved successfully" (MongoDB connection error is OK here — that's runtime, not import resolution)

- [ ] **Step 6: Commit**

```bash
git add -A backend/
git commit -m "chore: cleanup — remove generateToken.js, verify all imports

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Execution Notes

- Each task is independently testable and commits atomic changes
- After Task 15, all controllers are thin and delegate to services
- After Task 16, Zod validation is active on all POST/PUT routes
- After Task 17, `app.js` + `server.js` replace `index.js`
- The `errorHandler` middleware catches all `AppError` subclasses thrown from services
- All API responses maintain the same shape and status codes as before
- Vercel deployment path: `app.js` default export is the serverless entry point
