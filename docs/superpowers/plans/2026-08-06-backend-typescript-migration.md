# Backend TypeScript Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all 37 backend JavaScript files to TypeScript with `strict: true` and zero `any` types, preserving all business logic.

**Architecture:** Bottom-up, layer-by-layer migration using `tsx` as the runtime. ESM modules with `NodeNext` resolution. Mongoose document interfaces, Zod-inferred types, and Express request augmentation provide end-to-end type safety without `any`.

**Tech Stack:** TypeScript 5.x, tsx, Express 5, Mongoose 9, Zod 4, jsonwebtoken, bcryptjs

## Global Constraints

- `tsconfig.json` must have `"strict": true` (enables `noImplicitAny`, `strictNullChecks`, etc.)
- Zero uses of the `any` type in any `.ts` file
- Zero business logic changes — only add types, rename files, update imports
- All imports must keep `.js` extensions (NodeNext module resolution)
- Runtime: `tsx` for both dev and production (replaces `node`/`nodemon`)

---

### Task 1: Install TypeScript tooling and configure tsconfig

**Files:**
- Create: `backend/tsconfig.json`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `tsconfig.json` with strict mode, NodeNext module resolution, ES2022 target

- [ ] **Step 1: Install TypeScript and type packages**

```bash
cd backend
npm install --save-dev typescript tsx @types/express @types/cors @types/morgan @types/bcryptjs @types/jsonwebtoken
```

- [ ] **Step 2: Create tsconfig.json**

Write `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": ".",
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Update package.json scripts**

Change `backend/package.json` scripts to:
```json
"start": "tsx server.ts",
"dev": "tsx watch server.ts",
"build": "tsc --noEmit"
```

- [ ] **Step 4: Verify tsc runs (with zero files)**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors (no `.ts` files exist yet)

- [ ] **Step 5: Commit**

```bash
git add backend/tsconfig.json backend/package.json backend/package-lock.json
git commit -m "chore: add TypeScript config and tooling dependencies

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Create type definition files

**Files:**
- Create: `backend/types/express.d.ts`
- Create: `backend/types/IUser.ts`
- Create: `backend/types/ITask.ts`
- Create: `backend/types/ICategory.ts`
- Create: `backend/types/IProject.ts`
- Create: `backend/types/IStat.ts`
- Create: `backend/types/IInvalidatedToken.ts`

**Interfaces:**
- Consumes: `tsconfig.json` (Task 1)
- Produces: `IUser`, `IUserDocument`, `IUserModel`, `IUserMethods`, `ITask`, `ITaskDocument`, `ITaskModel`, `ICategory`, `ICategoryDocument`, `ICategoryModel`, `IProject`, `IProjectDocument`, `IProjectModel`, `IStat`, `IStatDocument`, `IStatModel`, `IInvalidatedToken`, `IInvalidatedTokenDocument`, `IInvalidatedTokenModel`, Express `Request` augmentation

- [ ] **Step 1: Create types directory**

```bash
mkdir -p backend/types
```

- [ ] **Step 2: Write Express request augmentation**

Write `backend/types/express.d.ts`:
```typescript
import { IUserDocument } from './IUser.js';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
      validatedBody?: Record<string, unknown>;
    }
  }
}

export {};
```

- [ ] **Step 3: Write IUser.ts**

Write `backend/types/IUser.ts`:
```typescript
import { Document, Model, Types } from 'mongoose';

export interface IUser {
  email: string;
  password: string;
  name: string;
  dob?: Date;
  nationality?: string;
  role: 'USER' | 'ADMIN';
  categories: Types.ObjectId[];
  avatarUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(plainPassword: string): Promise<boolean>;
}

export interface IUserDocument extends IUser, Document, IUserMethods {}

export interface IUserModel extends Model<IUserDocument> {}
```

- [ ] **Step 4: Write ICategory.ts**

Write `backend/types/ICategory.ts`:
```typescript
import { Document, Model, Types } from 'mongoose';

export interface ICategory {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategoryDocument extends ICategory, Document {}

export interface ICategoryModel extends Model<ICategoryDocument> {
  findByUserAndName(userId: Types.ObjectId | string, name: string): Promise<ICategoryDocument | null>;
}
```

- [ ] **Step 5: Write IProject.ts**

Write `backend/types/IProject.ts`:
```typescript
import { Document, Model, Types } from 'mongoose';

export interface IProject {
  userId: Types.ObjectId;
  name: string;
  description: string;
  color: string;
  status: 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectDocument extends IProject, Document {}

export interface IProjectModel extends Model<IProjectDocument> {
  findByUserAndName(userId: Types.ObjectId | string, name: string): Promise<IProjectDocument | null>;
}
```

- [ ] **Step 6: Write ITask.ts**

Write `backend/types/ITask.ts`:
```typescript
import { Document, Model, Types } from 'mongoose';
import { ICategory } from './ICategory.js';
import { IProject } from './IProject.js';
import { IUser } from './IUser.js';

export interface ITask {
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'given-up';
  priority: 'Low' | 'Medium' | 'High';
  categoryId: Types.ObjectId | null;
  projectId: Types.ObjectId | null;
  startDate: Date;
  dueDate?: Date;
  completedAt?: Date;
  isOverDue: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskDocument extends ITask, Document {}

export interface ITaskModel extends Model<ITaskDocument> {}
```

- [ ] **Step 7: Write IStat.ts**

Write `backend/types/IStat.ts`:
```typescript
import { Document, Model, Types } from 'mongoose';

export interface IDailyCategoryStat {
  categoryId: Types.ObjectId;
  categoryName: string;
  count: number;
}

export interface IDailyStat {
  date: Date;
  completedTasks: number;
  completedOfEachCategory: IDailyCategoryStat[];
  givenUpTasks: number;
  givenUpOfEachCategory: IDailyCategoryStat[];
}

export interface IStat {
  userId: Types.ObjectId;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  givenUpTasks: number;
  dailyStats: IDailyStat[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IStatDocument extends IStat, Document {}

export interface IStatModel extends Model<IStatDocument> {}
```

- [ ] **Step 8: Write IInvalidatedToken.ts**

Write `backend/types/IInvalidatedToken.ts`:
```typescript
import { Document, Model } from 'mongoose';

export interface IInvalidatedToken {
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvalidatedTokenDocument extends IInvalidatedToken, Document {}

export interface IInvalidatedTokenModel extends Model<IInvalidatedTokenDocument> {}
```

- [ ] **Step 9: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add backend/types/
git commit -m "feat: add TypeScript type definitions for all models and Express augmentation

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Convert constants and enums

**Files:**
- Rename: `backend/constants/taskStatus.js` → `backend/constants/taskStatus.ts`
- Rename: `backend/constants/projectStatus.js` → `backend/constants/projectStatus.ts`
- Rename: `backend/constants/priority.js` → `backend/constants/priority.ts`
- Rename: `backend/constants/datePatterns.js` → `backend/constants/datePatterns.ts`

**Interfaces:**
- Consumes: TypeScript tooling (Task 1)
- Produces: `TaskStatus` enum, `FINISHED_STATUSES` const, `ACTIVE_STATUSES` const, `ProjectStatus` enum, `Priority` enum, date pattern regexps (unchanged)

- [ ] **Step 1: Convert priority.js → priority.ts**

Delete `backend/constants/priority.js`. Write `backend/constants/priority.ts`:
```typescript
export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export const PRIORITIES: Priority[] = [Priority.Low, Priority.Medium, Priority.High];
```

- [ ] **Step 2: Convert taskStatus.js → taskStatus.ts**

Delete `backend/constants/taskStatus.js`. Write `backend/constants/taskStatus.ts`:
```typescript
export enum TaskStatus {
  Pending = 'pending',
  InProgress = 'in-progress',
  Completed = 'completed',
  GivenUp = 'given-up',
}

export const TASK_STATUSES: string[] = [
  TaskStatus.Pending,
  TaskStatus.InProgress,
  TaskStatus.Completed,
  TaskStatus.GivenUp,
];

export const FINISHED_STATUSES: string[] = [TaskStatus.Completed, TaskStatus.GivenUp];

export const ACTIVE_STATUSES: string[] = [TaskStatus.Pending, TaskStatus.InProgress];
```

- [ ] **Step 3: Convert projectStatus.js → projectStatus.ts**

Delete `backend/constants/projectStatus.js`. Write `backend/constants/projectStatus.ts`:
```typescript
export enum ProjectStatus {
  Active = 'active',
  Completed = 'completed',
}

export const PROJECT_STATUSES: string[] = [ProjectStatus.Active, ProjectStatus.Completed];
```

- [ ] **Step 4: Convert datePatterns.js → datePatterns.ts**

Delete `backend/constants/datePatterns.js`. Write `backend/constants/datePatterns.ts`:
```typescript
export const DATE_ONLY_PATTERN = /^(\d{4})[-/](\d{2})[-/](\d{2})$/;
export const DATE_TIME_LOCAL_BARE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:\d{2})?$/;
export const DATE_TIME_WITH_TZ_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
export const DISPLAY_DATE_TIME_PATTERN = /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/;
export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
```

- [ ] **Step 5: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add backend/constants/
git commit -m "refactor: convert constants to TypeScript enums

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Convert utils

**Files:**
- Rename: `backend/utils/errors.js` → `backend/utils/errors.ts`
- Rename: `backend/utils/dateTime.js` → `backend/utils/dateTime.ts`

**Interfaces:**
- Consumes: Date patterns (Task 3), TypeScript tooling
- Produces: `AppError`, `NotFoundError`, `ValidationError`, `ForbiddenError`, `UnauthorizedError`, `ConflictError`, `getStartOfToday()`, `normalizeTaskDateInput()`, `DateUpdateResult` type

- [ ] **Step 1: Convert errors.js → errors.ts**

Delete `backend/utils/errors.js`. Write `backend/utils/errors.ts`:
```typescript
export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(message, 400);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}
```

- [ ] **Step 2: Convert dateTime.js → dateTime.ts**

Delete `backend/utils/dateTime.js`. Write `backend/utils/dateTime.ts`:
```typescript
export interface DateUpdateResult {
  shouldUpdate: boolean;
  value?: Date | null;
  error?: string;
}

const DATE_ONLY_PATTERN = /^(\d{4})[-/](\d{2})[-/](\d{2})$/;
const DATE_TIME_LOCAL_BARE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:\d{2})?$/;
const DATE_TIME_WITH_TZ_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
const DISPLAY_DATE_TIME_PATTERN = /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/;

export const getStartOfToday = (): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

export const normalizeTaskDateInput = (value: unknown): DateUpdateResult => {
  if (value === undefined) {
    return { shouldUpdate: false };
  }

  if (value === null || value === '') {
    return { shouldUpdate: true, value: null };
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? { error: 'Invalid date value' }
      : { shouldUpdate: true, value };
  }

  if (typeof value === 'string') {
    const dateOnlyMatch = value.match(DATE_ONLY_PATTERN);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return {
        shouldUpdate: true,
        value: new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0),
      };
    }

    const dateTimeWithTzMatch = value.match(DATE_TIME_WITH_TZ_PATTERN);
    if (dateTimeWithTzMatch) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime())
        ? { error: 'Invalid date value' }
        : { shouldUpdate: true, value: parsed };
    }

    const dateTimeLocalMatch = value.match(DATE_TIME_LOCAL_BARE_PATTERN);
    if (dateTimeLocalMatch) {
      const [, year, month, day, hour, minute] = dateTimeLocalMatch;
      return {
        shouldUpdate: true,
        value: new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0),
      };
    }

    const displayDateTimeMatch = value.match(DISPLAY_DATE_TIME_PATTERN);
    if (displayDateTimeMatch) {
      const [, year, month, day, hour, minute] = displayDateTimeMatch;
      return {
        shouldUpdate: true,
        value: new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0),
      };
    }
  }

  const parsedDate = new Date(value as string | number | Date);
  if (Number.isNaN(parsedDate.getTime())) {
    return { error: 'Invalid date value' };
  }

  return { shouldUpdate: true, value: parsedDate };
};
```

- [ ] **Step 3: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add backend/utils/
git commit -m "refactor: convert utils to TypeScript with typed error classes

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Convert Mongoose models

**Files:**
- Rename: `backend/models/User.js` → `backend/models/User.ts`
- Rename: `backend/models/Task.js` → `backend/models/Task.ts`
- Rename: `backend/models/Category.js` → `backend/models/Category.ts`
- Rename: `backend/models/Project.js` → `backend/models/Project.ts`
- Rename: `backend/models/Stat.js` → `backend/models/Stat.ts`
- Rename: `backend/models/InvalidatedToken.js` → `backend/models/InvalidatedToken.ts`

**Interfaces:**
- Consumes: Type interfaces (Task 2), enums (Task 3), util types (Task 4)
- Produces: Typed Mongoose models: `User`, `Task`, `Category`, `Project`, `Stat`, `InvalidatedToken`

- [ ] **Step 1: Convert InvalidatedToken.js → InvalidatedToken.ts**

Delete `backend/models/InvalidatedToken.js`. Write `backend/models/InvalidatedToken.ts`:
```typescript
import mongoose, { Schema } from 'mongoose';
import { IInvalidatedTokenDocument, IInvalidatedTokenModel } from '../types/IInvalidatedToken.js';

const invalidatedTokenSchema = new Schema<IInvalidatedTokenDocument, IInvalidatedTokenModel>(
  {
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

invalidatedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const InvalidatedToken = mongoose.model<IInvalidatedTokenDocument, IInvalidatedTokenModel>(
  'InvalidatedToken',
  invalidatedTokenSchema
);

export default InvalidatedToken;
```

- [ ] **Step 2: Convert Stat.js → Stat.ts**

Delete `backend/models/Stat.js`. Write `backend/models/Stat.ts`:
```typescript
import mongoose, { Schema } from 'mongoose';
import { IStatDocument, IStatModel } from '../types/IStat.js';

const statSchema = new Schema<IStatDocument, IStatModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    totalTasks: { type: Number, required: true, default: 0 },
    completedTasks: { type: Number, required: true, default: 0 },
    pendingTasks: { type: Number, required: true, default: 0 },
    inProgressTasks: { type: Number, required: true, default: 0 },
    givenUpTasks: { type: Number, required: true, default: 0 },
    dailyStats: [
      {
        date: { type: Date, required: true },
        completedTasks: { type: Number, required: true, default: 0 },
        completedOfEachCategory: [
          {
            categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
            categoryName: { type: String, required: true },
            count: { type: Number, required: true, default: 0 },
          },
        ],
        givenUpTasks: { type: Number, required: true, default: 0 },
        givenUpOfEachCategory: [
          {
            categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
            categoryName: { type: String, required: true },
            count: { type: Number, required: true, default: 0 },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

const Stat = mongoose.model<IStatDocument, IStatModel>('Stat', statSchema);
export default Stat;
```

- [ ] **Step 3: Convert Project.js → Project.ts**

Delete `backend/models/Project.js`. Write `backend/models/Project.ts`:
```typescript
import mongoose, { Schema } from 'mongoose';
import { IProjectDocument, IProjectModel } from '../types/IProject.js';

const projectSchema = new Schema<IProjectDocument, IProjectModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    color: {
      type: String,
      trim: true,
      default: '#E5E7EB',
      validate: {
        validator: (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value),
        message: 'Project color must be a six-digit hex color',
      },
    },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
  },
  { timestamps: true }
);

projectSchema.index({ userId: 1, name: 1 }, { unique: true });
projectSchema.index({ userId: 1, status: 1 });

projectSchema.statics.findByUserAndName = function (userId: mongoose.Types.ObjectId | string, name: string) {
  return this.findOne({ userId, name });
};

projectSchema.pre('findOneAndDelete', async function () {
  const Task = mongoose.model('Task');
  const projectToDelete = await this.model.findOne(this.getQuery());

  if (projectToDelete) {
    await Task.updateMany(
      { projectId: projectToDelete._id },
      { $set: { projectId: null } }
    );
  }
});

const Project = mongoose.model<IProjectDocument, IProjectModel>('Project', projectSchema);
export default Project;
```

- [ ] **Step 4: Convert Category.js → Category.ts**

Delete `backend/models/Category.js`. Write `backend/models/Category.ts`:
```typescript
import mongoose, { Schema } from 'mongoose';
import { ICategoryDocument, ICategoryModel } from '../types/ICategory.js';

const categorySchema = new Schema<ICategoryDocument, ICategoryModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, name: 1 }, { unique: true });

categorySchema.statics.findByUserAndName = function (userId: mongoose.Types.ObjectId | string, name: string) {
  return this.findOne({ userId, name });
};

categorySchema.pre('findOneAndDelete', async function () {
  const Task = mongoose.model('Task');
  const Category = mongoose.model<ICategoryDocument, ICategoryModel>('Category');
  const categoryToDelete = await this.model.findOne(this.getQuery());

  if (categoryToDelete) {
    const uncategorizedCategory = await Category.findOne({
      userId: categoryToDelete.userId,
      name: 'Uncategorized',
    });
    await Task.updateMany(
      { categoryId: categoryToDelete._id },
      { $set: { categoryId: uncategorizedCategory?._id || null } }
    );
  }
});

const Category = mongoose.model<ICategoryDocument, ICategoryModel>('Category', categorySchema);
export default Category;
```

- [ ] **Step 5: Convert Task.js → Task.ts**

Delete `backend/models/Task.js`. Write `backend/models/Task.ts`:
```typescript
import mongoose, { Schema } from 'mongoose';
import { ITaskDocument, ITaskModel } from '../types/ITask.js';
import { getStartOfToday } from '../utils/dateTime.js';

const taskSchema = new Schema<ITaskDocument, ITaskModel>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'given-up'],
      default: 'pending',
    },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    startDate: { type: Date, default: getStartOfToday },
    dueDate: { type: Date },
    completedAt: { type: Date },
    isOverDue: { type: Boolean, default: false },
  },
  { timestamps: true }
);

taskSchema.index({ categoryId: 1 });
taskSchema.index({ projectId: 1 });
taskSchema.index({ dueDate: 1 });

const Task = mongoose.model<ITaskDocument, ITaskModel>('Task', taskSchema);
export default Task;
```

- [ ] **Step 6: Convert User.js → User.ts**

Delete `backend/models/User.js`. Write `backend/models/User.ts`:
```typescript
import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUserDocument, IUserModel } from '../types/IUser.js';
import { createDefaultCategories } from '../config/initialize.js';

const userSchema = new Schema<IUserDocument, IUserModel>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    dob: { type: Date },
    nationality: { type: String, trim: true },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  (this.$locals as Record<string, unknown>).wasNew = this.isNew;

  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(parseInt(process.env.SALT_ROUNDS as string, 10));
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.post('save', async function (doc: IUserDocument) {
  const wasNew = (this.$locals as Record<string, boolean | undefined>).wasNew;
  if (wasNew) {
    await createDefaultCategories(doc._id as mongoose.Types.ObjectId, doc.email);
  }
});

userSchema.methods.comparePassword = async function (plainPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.pre('findOneAndDelete', async function () {
  const Category = mongoose.model('Category');
  const Project = mongoose.model('Project');
  const Task = mongoose.model('Task');

  const userToDelete = await this.model.findOne(this.getQuery());

  if (userToDelete) {
    const categories = await Category.find({ userId: userToDelete._id });
    const categoryIds = categories.map((cat: { _id: mongoose.Types.ObjectId }) => cat._id);
    const projects = await Project.find({ userId: userToDelete._id });
    const projectIds = projects.map((project: { _id: mongoose.Types.ObjectId }) => project._id);

    const taskDeleteConditions: Array<Record<string, unknown>> = [];
    if (categoryIds.length > 0) {
      taskDeleteConditions.push({ categoryId: { $in: categoryIds } });
    }
    if (projectIds.length > 0) {
      taskDeleteConditions.push({ projectId: { $in: projectIds } });
    }

    if (taskDeleteConditions.length > 0) {
      await Task.deleteMany(
        taskDeleteConditions.length === 1 ? taskDeleteConditions[0] : { $or: taskDeleteConditions }
      );
    }

    await Project.deleteMany({ userId: userToDelete._id });
    await Category.deleteMany({ userId: userToDelete._id });
  }
});

const User = mongoose.model<IUserDocument, IUserModel>('User', userSchema);
export default User;
```

- [ ] **Step 7: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add backend/models/
git commit -m "refactor: convert Mongoose models to TypeScript

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Convert config files

**Files:**
- Rename: `backend/config/env.js` → `backend/config/env.ts`
- Rename: `backend/config/db.js` → `backend/config/db.ts`
- Rename: `backend/config/initialize.js` → `backend/config/initialize.ts`

**Interfaces:**
- Consumes: Models (Task 5), types (Task 2)
- Produces: `CorsOptions`, `ServerConfig`, typed `env.ts`, `db.ts`, `initialize.ts`

- [ ] **Step 1: Convert env.js → env.ts**

Delete `backend/config/env.js`. Write `backend/config/env.ts`:
```typescript
import { CorsOptions } from 'cors';

const DEFAULT_ALLOWED_ORIGINS: string[] = [
  'https://fetodo-six.vercel.app',
  'https://fetodo.vercel.app',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://103.211.207.65:3636',
];

const normalizeOrigin = (origin: string): string => origin.replace(/\/+$/, '');

const parseAllowedOrigins = (value: string | undefined): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
};

export const getAllowedOrigins = (): string[] => {
  const configuredOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  return configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS;
};

export const createCorsOptions = (): CorsOptions => {
  const allowedOrigins = new Set(getAllowedOrigins());

  return {
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalizedOrigin = normalizeOrigin(origin);
      if (allowedOrigins.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin '${origin}' is not allowed by CORS`));
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  };
};

export interface ServerConfig {
  port: number;
  host: string;
}

export const getServerConfig = (): ServerConfig => ({
  port: Number.parseInt(process.env.PORT ?? '3001', 10),
  host: process.env.HOST ?? '0.0.0.0',
});

export const validateServerEnv = (): void => {
  const missing: string[] = [];

  if (!process.env.MONGO_URI) missing.push('MONGO_URI');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.JWT_EXPIRES_IN) missing.push('JWT_EXPIRES_IN');
  if (!process.env.SALT_ROUNDS) missing.push('SALT_ROUNDS');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const saltRounds = Number.parseInt(process.env.SALT_ROUNDS as string, 10);
  if (Number.isNaN(saltRounds) || saltRounds <= 0) {
    throw new Error('SALT_ROUNDS must be a positive integer');
  }
};

export const getAiApiKey = (): string | null => process.env.AI_API_KEY?.trim() || null;

export const getAiBaseUrl = (): string | null => process.env.AI_BASE_URL?.trim() || null;

export const getAiModel = (): string | null => process.env.AI_MODEL_NAME?.trim() || null;
```

- [ ] **Step 2: Convert db.js → db.ts**

Delete `backend/config/db.js`. Write `backend/config/db.ts`:
```typescript
import mongoose from 'mongoose';

let connectionPromise: Promise<mongoose.Connection> | undefined;

export const connectDB = async (): Promise<mongoose.Connection> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    const { MONGO_URI, MONGO_NAME } = process.env;

    if (!MONGO_URI) {
      throw new Error('Missing required environment variable: MONGO_URI');
    }

    connectionPromise = mongoose
      .connect(MONGO_URI, { dbName: MONGO_NAME || undefined })
      .then((connection) => {
        console.log('Connected to MongoDB');
        return connection.connection;
      })
      .catch((error: unknown) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
};
```

- [ ] **Step 3: Convert initialize.js → initialize.ts**

Delete `backend/config/initialize.js`. Write `backend/config/initialize.ts`:
```typescript
import mongoose from 'mongoose';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Stat from '../models/Stat.js';
import Task from '../models/Task.js';

const initCategory: string[] = ['Work', 'Personal', 'Health', 'Uncategorized'];

const toLocalDateKey = (value: unknown): string => {
  const date = new Date(value as string | number | Date);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

export const createDefaultCategories = async (
  userId: mongoose.Types.ObjectId,
  userEmail: string
): Promise<void> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error(`   User with ID ${String(userId)} not found.`);
      return;
    }
    if (user.name === 'Admin') {
      console.log(`   Skipping default categories for admin user ${userEmail}`);
      return;
    }
    for (const categoryName of initCategory) {
      const existingCategory = await Category.findByUserAndName(userId, categoryName);
      if (!existingCategory) {
        const newCategory = await Category.create({
          userId: userId,
          name: categoryName,
          description: `Default ${categoryName} category`,
        });
        user.categories.push(newCategory._id);
        console.log(`   Created default category '${categoryName}' for user ${userEmail}`);
      } else {
        if (!user.categories.includes(existingCategory._id)) {
          user.categories.push(existingCategory._id);
        }
      }
    }
    await user.save();
  } catch (error: unknown) {
    console.error(
      `   Error creating default categories for user ${userEmail}:`,
      (error as Error).message
    );
  }
};

export const initializeStats = async (): Promise<void> => {
  try {
    console.log('*** Initializing stats for all users ***');
    const users = await User.find({ role: { $ne: 'ADMIN' } });
    for (const user of users) {
      await updateStat(user._id as mongoose.Types.ObjectId);
    }
    console.log('*** Stats initialization completed ***');
  } catch (error: unknown) {
    console.error('   Error initializing stats:', (error as Error).message);
  }
};

export const updateStat = async (userId: mongoose.Types.ObjectId): Promise<void> => {
  try {
    let stats = await Stat.findOne({ userId });
    if (!stats) {
      stats = new Stat({ userId });
    }

    const userCategories = await Category.find({ userId });
    const categoryIds = userCategories.map((cat) => cat._id);

    const allTasks = await Task.find({ categoryId: { $in: categoryIds } });

    stats.totalTasks = allTasks.length;
    stats.pendingTasks = allTasks.filter((t) => t.status === 'pending').length;
    stats.inProgressTasks = allTasks.filter((t) => t.status === 'in-progress').length;
    stats.completedTasks = allTasks.filter((t) => t.status === 'completed').length;
    stats.givenUpTasks = allTasks.filter((t) => t.status === 'given-up').length;

    stats.dailyStats = [];

    const completedTasks = allTasks.filter(
      (t) => t.status === 'completed' && (t.completedAt || t.updatedAt)
    );
    const givenUpTasks = allTasks.filter((t) => t.status === 'given-up' && t.updatedAt);

    const dailyStatsMap = new Map<
      string,
      {
        date: Date;
        completedTasks: number;
        completedOfEachCategory: Array<{
          categoryId: mongoose.Types.ObjectId;
          categoryName: string;
          count: number;
        }>;
        givenUpTasks: number;
        givenUpOfEachCategory: Array<{
          categoryId: mongoose.Types.ObjectId;
          categoryName: string;
          count: number;
        }>;
      }
    >();

    for (const task of completedTasks) {
      const completedDate = task.completedAt || task.updatedAt;
      const dateStr = toLocalDateKey(completedDate);

      if (!dailyStatsMap.has(dateStr)) {
        dailyStatsMap.set(dateStr, {
          date: new Date(dateStr),
          completedTasks: 0,
          completedOfEachCategory: [],
          givenUpTasks: 0,
          givenUpOfEachCategory: [],
        });
      }

      const dailyStat = dailyStatsMap.get(dateStr)!;
      dailyStat.completedTasks += 1;

      const category = userCategories.find(
        (c) => c._id.toString() === task.categoryId!.toString()
      );
      if (category) {
        const existing = dailyStat.completedOfEachCategory.find(
          (cs) => cs.categoryId.toString() === category._id.toString()
        );
        if (existing) {
          existing.count += 1;
        } else {
          dailyStat.completedOfEachCategory.push({
            categoryId: category._id,
            categoryName: category.name,
            count: 1,
          });
        }
      }
    }

    for (const task of givenUpTasks) {
      const dateStr = toLocalDateKey(task.updatedAt);

      if (!dailyStatsMap.has(dateStr)) {
        dailyStatsMap.set(dateStr, {
          date: new Date(dateStr),
          completedTasks: 0,
          completedOfEachCategory: [],
          givenUpTasks: 0,
          givenUpOfEachCategory: [],
        });
      }

      const dailyStat = dailyStatsMap.get(dateStr)!;
      dailyStat.givenUpTasks += 1;

      const category = userCategories.find(
        (c) => c._id.toString() === task.categoryId!.toString()
      );
      if (category) {
        const existing = dailyStat.givenUpOfEachCategory.find(
          (cs) => cs.categoryId.toString() === category._id.toString()
        );
        if (existing) {
          existing.count += 1;
        } else {
          dailyStat.givenUpOfEachCategory.push({
            categoryId: category._id,
            categoryName: category.name,
            count: 1,
          });
        }
      }
    }

    stats.dailyStats = Array.from(dailyStatsMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    await stats.save();
    console.log(`   Stats updated for user ${String(userId)}: ${stats.totalTasks} total tasks`);
  } catch (error: unknown) {
    console.error('Error updating stats:', error);
  }
};
```

- [ ] **Step 4: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add backend/config/
git commit -m "refactor: convert config files to TypeScript

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Convert repositories

**Files:**
- Rename: `backend/repositories/userRepository.js` → `backend/repositories/userRepository.ts`
- Rename: `backend/repositories/taskRepository.js` → `backend/repositories/taskRepository.ts`
- Rename: `backend/repositories/categoryRepository.js` → `backend/repositories/categoryRepository.ts`
- Rename: `backend/repositories/projectRepository.js` → `backend/repositories/projectRepository.ts`
- Rename: `backend/repositories/statRepository.js` → `backend/repositories/statRepository.ts`
- Rename: `backend/repositories/invalidatedTokenRepository.js` → `backend/repositories/invalidatedTokenRepository.ts`

**Interfaces:**
- Consumes: Models (Task 5), type interfaces (Task 2)
- Produces: Typed repository objects with explicit return types

Each repository follows this pattern — the key change is adding `: Promise<...>` return types and typing the `data`/`update`/`query` parameters.

- [ ] **Step 1: Convert invalidatedTokenRepository.js → invalidatedTokenRepository.ts**

Delete `backend/repositories/invalidatedTokenRepository.js`. Write:
```typescript
import InvalidatedToken from '../models/InvalidatedToken.js';
import { IInvalidatedTokenDocument } from '../types/IInvalidatedToken.js';

export const invalidatedTokenRepository = {
  create(data: { token: string; expiresAt: Date }): Promise<IInvalidatedTokenDocument> {
    return InvalidatedToken.create(data);
  },

  findByToken(token: string): Promise<IInvalidatedTokenDocument | null> {
    return InvalidatedToken.findOne({ token });
  },
};
```

- [ ] **Step 2: Convert statRepository.js → statRepository.ts**

Delete `backend/repositories/statRepository.js`. Write:
```typescript
import mongoose from 'mongoose';
import Stat from '../models/Stat.js';
import Task from '../models/Task.js';
import Category from '../models/Category.js';
import Project from '../models/Project.js';
import { IStatDocument } from '../types/IStat.js';
import { ITaskDocument } from '../types/ITask.js';
import { IUserDocument } from '../types/IUser.js';

export const statRepository = {
  findByUser(userId: mongoose.Types.ObjectId | string): Promise<IStatDocument | null> {
    return Stat.findOne({ userId });
  },

  async getTasksByUser(user: IUserDocument): Promise<ITaskDocument[]> {
    if (user.role === 'ADMIN') {
      return Task.find({})
        .populate('categoryId', 'name userId')
        .populate('projectId', 'name userId');
    }

    const [userCategories, userProjects] = await Promise.all([
      Category.find({ userId: user._id }).select('_id name'),
      Project.find({ userId: user._id }).select('_id'),
    ]);

    const ownershipClauses: Array<Record<string, unknown>> = [];
    if (userCategories.length > 0) {
      ownershipClauses.push({
        categoryId: { $in: userCategories.map((c) => c._id) },
      });
    }
    if (userProjects.length > 0) {
      ownershipClauses.push({
        projectId: { $in: userProjects.map((p) => p._id) },
      });
    }

    if (ownershipClauses.length === 0) return [];

    const query = ownershipClauses.length === 1 ? ownershipClauses[0] : { $or: ownershipClauses };

    return Task.find(query)
      .populate('categoryId', 'name userId')
      .populate('projectId', 'name userId');
  },
};
```

- [ ] **Step 3: Convert userRepository.js → userRepository.ts**

Delete `backend/repositories/userRepository.js`. Write:
```typescript
import mongoose from 'mongoose';
import User from '../models/User.js';
import { IUserDocument } from '../types/IUser.js';

export const userRepository = {
  findById(id: mongoose.Types.ObjectId | string): Promise<IUserDocument | null> {
    return User.findById(id);
  },

  findByIdWithPassword(id: mongoose.Types.ObjectId | string): Promise<IUserDocument | null> {
    return User.findById(id).select('+password');
  },

  findByIdPopulated(id: mongoose.Types.ObjectId | string): Promise<IUserDocument | null> {
    return User.findById(id).populate('categories', 'name description');
  },

  findByEmail(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email });
  },

  findByEmailWithPassword(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email }).select('+password');
  },

  findAll(): Promise<IUserDocument[]> {
    return User.find().select('-password').populate('categories', 'name description');
  },

  create(data: Record<string, unknown>): Promise<IUserDocument> {
    return User.create(data);
  },

  updateById(
    id: mongoose.Types.ObjectId | string,
    update: Record<string, unknown>
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).select(
      '-password'
    );
  },

  deleteById(id: mongoose.Types.ObjectId | string): Promise<IUserDocument | null> {
    return User.findByIdAndDelete(id);
  },

  addCategory(
    userId: mongoose.Types.ObjectId | string,
    categoryId: mongoose.Types.ObjectId
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(userId, { $push: { categories: categoryId } });
  },

  removeCategory(
    userId: mongoose.Types.ObjectId | string,
    categoryId: mongoose.Types.ObjectId | string
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(userId, { $pull: { categories: categoryId } });
  },
};
```

- [ ] **Step 4: Convert categoryRepository.js → categoryRepository.ts**

Delete `backend/repositories/categoryRepository.js`. Write:
```typescript
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import { ICategoryDocument } from '../types/ICategory.js';

export const categoryRepository = {
  findById(id: mongoose.Types.ObjectId | string): Promise<ICategoryDocument | null> {
    return Category.findById(id);
  },

  findByIdPopulated(id: mongoose.Types.ObjectId | string): Promise<ICategoryDocument | null> {
    return Category.findById(id).populate('userId', 'name email');
  },

  findByUser(userId: mongoose.Types.ObjectId | string): Promise<ICategoryDocument[]> {
    return Category.find({ userId }).populate('userId', 'name email');
  },

  findAll(): Promise<ICategoryDocument[]> {
    return Category.find({}).populate('userId', 'name email');
  },

  findByUserAndName(
    userId: mongoose.Types.ObjectId | string,
    name: string
  ): Promise<ICategoryDocument | null> {
    return Category.findOne({ userId, name });
  },

  create(data: Record<string, unknown>): Promise<ICategoryDocument> {
    return Category.create(data);
  },

  updateById(
    id: mongoose.Types.ObjectId | string,
    update: Record<string, unknown>
  ): Promise<ICategoryDocument | null> {
    return Category.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  },

  deleteById(id: mongoose.Types.ObjectId | string): Promise<ICategoryDocument | null> {
    return Category.findByIdAndDelete(id);
  },
};
```

- [ ] **Step 5: Convert projectRepository.js → projectRepository.ts**

Delete `backend/repositories/projectRepository.js`. Write:
```typescript
import mongoose from 'mongoose';
import Project from '../models/Project.js';
import { IProjectDocument } from '../types/IProject.js';

export const projectRepository = {
  findById(id: mongoose.Types.ObjectId | string): Promise<IProjectDocument | null> {
    return Project.findById(id);
  },

  findByIdPopulated(id: mongoose.Types.ObjectId | string): Promise<IProjectDocument | null> {
    return Project.findById(id).populate('userId', 'name email');
  },

  findByUser(userId: mongoose.Types.ObjectId | string): Promise<IProjectDocument[]> {
    return Project.find({ userId });
  },

  findByUserPopulated(userId: mongoose.Types.ObjectId | string): Promise<IProjectDocument[]> {
    return Project.find({ userId }).populate('userId', 'name email').sort({ createdAt: -1 });
  },

  findAllPopulated(): Promise<IProjectDocument[]> {
    return Project.find().populate('userId', 'name email').sort({ createdAt: -1 });
  },

  findByUserAndName(
    userId: mongoose.Types.ObjectId | string,
    name: string
  ): Promise<IProjectDocument | null> {
    return Project.findOne({ userId, name });
  },

  create(data: Record<string, unknown>): Promise<IProjectDocument> {
    return Project.create(data);
  },

  updateById(
    id: mongoose.Types.ObjectId | string,
    update: Record<string, unknown>
  ): Promise<IProjectDocument | null> {
    return Project.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  },

  updateByIdPopulated(
    id: mongoose.Types.ObjectId | string,
    update: Record<string, unknown>
  ): Promise<IProjectDocument | null> {
    return Project.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).populate(
      'userId',
      'name email'
    );
  },

  deleteById(id: mongoose.Types.ObjectId | string): Promise<IProjectDocument | null> {
    return Project.findOneAndDelete({ _id: id });
  },
};
```

- [ ] **Step 6: Convert taskRepository.js → taskRepository.ts**

Delete `backend/repositories/taskRepository.js`. Write:
```typescript
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import { ITaskDocument } from '../types/ITask.js';

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
  findById(id: mongoose.Types.ObjectId | string): Promise<ITaskDocument | null> {
    return Task.findById(id);
  },

  findByIdPopulated(id: mongoose.Types.ObjectId | string): Promise<ITaskDocument | null> {
    return Task.findById(id).populate(TASK_POPULATE);
  },

  find(
    query: Record<string, unknown> = {},
    options: { sort?: Record<string, 1 | -1> } = {}
  ): Promise<ITaskDocument[]> {
    return Task.find(query).sort(options.sort || { dueDate: 1, createdAt: -1 });
  },

  findPopulated(
    query: Record<string, unknown> = {},
    options: { sort?: Record<string, 1 | -1> } = {}
  ): Promise<ITaskDocument[]> {
    return Task.find(query)
      .sort(options.sort || { dueDate: 1, createdAt: -1 })
      .populate(TASK_POPULATE);
  },

  create(data: Record<string, unknown>): Promise<ITaskDocument> {
    return Task.create(data);
  },

  updateById(
    id: mongoose.Types.ObjectId | string,
    update: Record<string, unknown>
  ): Promise<ITaskDocument | null> {
    return Task.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  },

  updateByIdPopulated(
    id: mongoose.Types.ObjectId | string,
    update: Record<string, unknown>
  ): Promise<ITaskDocument | null> {
    return Task.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).populate(
      TASK_POPULATE
    );
  },

  deleteById(id: mongoose.Types.ObjectId | string): Promise<ITaskDocument | null> {
    return Task.findByIdAndDelete(id);
  },

  aggregate(pipeline: mongoose.PipelineStage[]): Promise<Array<Record<string, unknown>>> {
    return Task.aggregate(pipeline);
  },
};
```

- [ ] **Step 7: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add backend/repositories/
git commit -m "refactor: convert repositories to TypeScript

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Convert validations

**Files:**
- Rename: `backend/validations/authValidation.js` → `backend/validations/authValidation.ts`
- Rename: `backend/validations/taskValidation.js` → `backend/validations/taskValidation.ts`
- Rename: `backend/validations/categoryValidation.js` → `backend/validations/categoryValidation.ts`
- Rename: `backend/validations/projectValidation.js` → `backend/validations/projectValidation.ts`
- Rename: `backend/validations/userValidation.js` → `backend/validations/userValidation.ts`
- Rename: `backend/validations/aiValidation.js` → `backend/validations/aiValidation.ts`

**Interfaces:**
- Consumes: Enums (Task 3)
- Produces: Zod schemas + inferred `z.infer` types for each

- [ ] **Step 1: Convert all validation files**

Delete each `.js` file and write the `.ts` equivalent. The schema definitions stay identical to the JS versions. Each file gets `z.infer` type exports added:

`authValidation.ts` — schemas identical to JS, plus:
```typescript
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
```

`taskValidation.ts` — schemas identical to JS (with imported `PRIORITIES`/`TASK_STATUSES`), plus:
```typescript
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
```

`categoryValidation.ts`, `projectValidation.ts`, `userValidation.ts`, `aiValidation.ts` — same pattern: schemas identical to JS, plus `z.infer` type exports.

- [ ] **Step 2: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/validations/
git commit -m "refactor: convert Zod validations to TypeScript with inferred types

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Convert services

**Files:**
- Rename: `backend/services/authService.js` → `backend/services/authService.ts`
- Rename: `backend/services/taskService.js` → `backend/services/taskService.ts`
- Rename: `backend/services/categoryService.js` → `backend/services/categoryService.ts`
- Rename: `backend/services/projectService.js` → `backend/services/projectService.ts`
- Rename: `backend/services/userService.js` → `backend/services/userService.ts`
- Rename: `backend/services/statService.js` → `backend/services/statService.ts`
- Rename: `backend/services/aiService.js` → `backend/services/aiService.ts`

**Interfaces:**
- Consumes: Repositories (Task 7), Models (Task 5), Utils/Errors (Task 4), Validation types (Task 8), Type interfaces (Task 2)
- Produces: Typed service objects

**Key patterns for services:**
- Add explicit return types to every method
- Type the `data` parameter using Zod inferred types where applicable
- Type `user` parameter as `IUserDocument`
- `verifyOwnership` uses the document interface from Task 2
- `buildTaskAccessQuery` returns `Record<string, unknown>` (MongoDB query shape)

Each service is converted by:
1. Delete the `.js` file
2. Write the `.ts` file with identical logic but typed parameters and return types
3. Import from `.js` paths (which resolve to `.ts` files at runtime via tsx)

- [ ] **Step 1: Convert userService.js → userService.ts**

Add types to all method parameters, return types, and internal variables. Business logic unchanged.

- [ ] **Step 2: Convert statService.js → statService.ts**

Add types to `ensureStat`, `getTodayDailyStat`, `incrementCategoryCount`, `decrementCategoryCount`, `getCategoryStatPayload`, `getTaskCompletionDate`, `getEntityPayload`, `serializeCompletedTask`, `rebuildStats`, and all increment/decrement functions.

- [ ] **Step 3: Convert categoryService.js → categoryService.ts**

Type `verifyOwnership` with `ICategoryDocument` and `IUserDocument`. Type all service methods.

- [ ] **Step 4: Convert projectService.js → projectService.ts**

Type summary functions (`createEmptySummary`, `addCompletionRate`, `computeSummaryMap`, etc.) and all service methods.

- [ ] **Step 5: Convert authService.js → authService.ts**

Add JWT payload types. Type `addTokenToBlacklist`, `generateAccessToken`, `generateRefreshToken`, and all service methods.

- [ ] **Step 6: Convert taskService.js → taskService.ts**

Type `resolveCategory`, `resolveProject`, `buildTaskAccessQuery`, `parseDateRangeQuery`, `applyCompletionTimestamp`, `getOwnerId`, `verifyOwnership`, and all service methods.

- [ ] **Step 7: Convert aiService.js → aiService.ts**

Type `categoryMap`, AI response handling, and both service methods.

- [ ] **Step 8: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add backend/services/
git commit -m "refactor: convert services to TypeScript

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Convert middlewares

**Files:**
- Rename: `backend/middlewares/auth.js` → `backend/middlewares/auth.ts`
- Rename: `backend/middlewares/errorHandler.js` → `backend/middlewares/errorHandler.ts`
- Rename: `backend/middlewares/validate.js` → `backend/middlewares/validate.ts`

**Interfaces:**
- Consumes: Models (Task 5), Utils (Task 4), Zod schemas
- Produces: Typed middleware functions

- [ ] **Step 1: Convert validate.js → validate.ts**

Delete `backend/middlewares/validate.js`. Write:
```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: result.error.errors[0].message });
    }
    req.validatedBody = result.data;
    next();
  };
```

- [ ] **Step 2: Convert errorHandler.js → errorHandler.ts**

Delete `backend/middlewares/errorHandler.js`. Write:
```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  console.error('Unhandled error:', err);

  if (req.path.startsWith('/api/') || req.path === '/healthz') {
    res.status(500).json({ message: err.message || 'Internal server error' });
    return;
  }

  res.status(500).send('Internal server error');
};
```

- [ ] **Step 3: Convert auth.js → auth.ts**

Delete `backend/middlewares/auth.js`. Write:
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

interface JwtPayload {
  id: string;
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401).json({ message: 'Not authorized, user not found' });
        return;
      }

      next();
      return;
    } catch (error: unknown) {
      console.error('Error in auth middleware:', (error as Error).message);
      res.status(401).json({ message: 'Not authorized, token failed' });
      return;
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Cannot find the token' });
    return;
  }
};

export const authorize =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { role } = req.user;

    if (!roles.includes(role)) {
      res.status(403).json({
        message: `User role '${role}' is not authorized to access this route`,
      });
      return;
    }
    next();
  };
```

- [ ] **Step 4: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add backend/middlewares/
git commit -m "refactor: convert middlewares to TypeScript

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Convert controllers

**Files:**
- Rename: `backend/controllers/authController.js` → `backend/controllers/authController.ts`
- Rename: `backend/controllers/taskController.js` → `backend/controllers/taskController.ts`
- Rename: `backend/controllers/categoryController.js` → `backend/controllers/categoryController.ts`
- Rename: `backend/controllers/projectController.js` → `backend/controllers/projectController.ts`
- Rename: `backend/controllers/userController.js` → `backend/controllers/userController.ts`
- Rename: `backend/controllers/statController.js` → `backend/controllers/statController.ts`
- Rename: `backend/controllers/aiController.js` → `backend/controllers/aiController.ts`

**Interfaces:**
- Consumes: Services (Task 9), Middleware augmentation types (Task 2)
- Produces: Typed Express request handlers

Each controller method gets typed as `(req: Request, res: Response, next: NextFunction) => Promise<void>`.

- [ ] **Step 1: Convert all 7 controller files**

For each controller:
1. Delete `.js` file
2. Write `.ts` file with same logic, adding `Request`, `Response`, `NextFunction` imports from express
3. Type the `async (req, res, next)` signatures
4. Use `req.validatedBody` with the Zod-inferred types from Task 8 where applicable

- [ ] **Step 2: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/controllers/
git commit -m "refactor: convert controllers to TypeScript

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Convert entry points (libs, routes, app, server)

**Files:**
- Rename: `backend/libs/aiClient.js` → `backend/libs/aiClient.ts`
- Rename: `backend/routes/authRoute.js` → `backend/routes/authRoute.ts`
- Rename: `backend/routes/taskRoute.js` → `backend/routes/taskRoute.ts`
- Rename: `backend/routes/categoryRoute.js` → `backend/routes/categoryRoute.ts`
- Rename: `backend/routes/projectRoute.js` → `backend/routes/projectRoute.ts`
- Rename: `backend/routes/userRoute.js` → `backend/routes/userRoute.ts`
- Rename: `backend/routes/statRoute.js` → `backend/routes/statRoute.ts`
- Rename: `backend/routes/aiRoutes.js` → `backend/routes/aiRoutes.ts`
- Rename: `backend/app.js` → `backend/app.ts`
- Rename: `backend/server.js` → `backend/server.ts`

- [ ] **Step 1: Convert aiClient.js → aiClient.ts**

Type `client` as `OpenAI | undefined`. Type `getAiClient` return as `OpenAI`.

- [ ] **Step 2: Convert all 7 route files**

Routes are largely unchanged — just rename and add `import { Router } from 'express'` with typed `Router()`.

- [ ] **Step 3: Convert app.js → app.ts**

Type `startupPromise` as `Promise<void> | undefined`. Add `Request`, `Response`, `NextFunction` imports. Keep lazy startup logic identical.

- [ ] **Step 4: Convert server.js → server.ts**

Type the `start` function. Add `void` return annotations.

- [ ] **Step 5: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add backend/libs/ backend/routes/ backend/app.ts backend/server.ts
git commit -m "refactor: convert entry points to TypeScript

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: Cleanup and final verification

**Files:**
- Remove: All remaining `.js` files (already renamed, but verify none left)
- Remove: `nodemon` from devDependencies (replaced by `tsx watch`)

- [ ] **Step 1: Remove nodemon**

```bash
cd backend && npm uninstall nodemon
```

- [ ] **Step 2: Verify no .js source files remain**

```bash
find backend -name "*.js" -not -path "*/node_modules/*" -not -path "*/.vercel/*"
```
Expected: No output (all source files converted)

- [ ] **Step 3: Full type check**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Runtime smoke test**

Run: `cd backend && npx tsx server.ts & sleep 3 && curl http://localhost:3001/healthz`
Expected: `{"ok":true}`

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: remove nodemon, final TypeScript cleanup

Co-Authored-By: Claude <noreply@anthropic.com>"
```
