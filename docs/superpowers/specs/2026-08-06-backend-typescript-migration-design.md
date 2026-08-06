# Backend TypeScript Migration Design

**Date:** 2026-08-06
**Status:** Approved

## Requirements

1. `strict: true` in tsconfig — all strict checks enabled including `noImplicitAny`
2. Avoid `any` type — use proper interfaces, enums, and union types throughout
3. Keep business logic unchanged — only add types, don't refactor behavior

## Tooling

- **Runtime:** `tsx` for both dev (`tsx watch`) and production (`tsx`). Replaces `nodemon`.
- **No build step.** No `dist/` directory. `tsx` executes `.ts` directly.
- **Module system:** Keep ESM (`"type": "module"`). Use `NodeNext` module resolution.
- **Import extensions:** Keep `.js` extensions in imports (TS resolves `.ts` → `.js` under NodeNext).

### tsconfig.json

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

### New devDependencies

- `typescript` — compiler
- `tsx` — runtime/runner
- `@types/express` — Express types
- `@types/cors` — CORS types
- `@types/morgan` — Morgan types
- `@types/bcryptjs` — bcrypt types
- `@types/jsonwebtoken` — JWT types

### Package.json scripts

```json
"start": "tsx server.ts",
"dev": "tsx watch server.ts",
"build": "tsc --noEmit"
```

## Type System Design

### Enums (replace string array constants)

| File | TypeScript |
|------|-----------|
| `priority.js` | `enum Priority { Low = 'Low', Medium = 'Medium', High = 'High' }` |
| `taskStatus.js` | `enum TaskStatus { Pending = 'pending', InProgress = 'in-progress', Completed = 'completed', GivenUp = 'given-up' }` |
| `projectStatus.js` | `enum ProjectStatus { Active = 'active', Completed = 'completed' }` |
| New | `enum UserRole { User = 'USER', Admin = 'ADMIN' }` |

### Mongoose Document Interfaces (`types/` directory)

Each model gets:
- `I<Name>` — plain object interface (fields only)
- `I<Name>Document` — extends `I<Name>` and `Document` (Mongoose document instance)
- `I<Name>Model` — extends `Model<I<Name>Document>` (model statics)

Key patterns:
- `categoryId`/`projectId` on Task use union types for populated vs unpopulated state
- Timestamps are auto-generated via Mongoose, included in interfaces as `createdAt: Date; updatedAt: Date`
- Schema hooks access `this` which is typed as the document type

### Express Request Augmentation (`types/express.d.ts`)

```typescript
declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
      validatedBody?: Record<string, unknown>;
    }
  }
}
```

### Zod Inferred Types

Each validation schema exports its inferred type:
```typescript
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
```

Controllers cast `req.validatedBody` to the appropriate input type.

### Custom Error Classes

Add `statusCode: number` field typed on `AppError`. Hierarchy stays: `AppError` → `NotFoundError(404)`, `ValidationError(400)`, `ForbiddenError(403)`, `UnauthorizedError(401)`, `ConflictError(409)`.

### Environment Types

Create a typed env helper or use `process.env` with non-null assertions after `validateServerEnv()` has run. Services read env vars at call time (not import time), so they remain testable.

## Migration Order (11 steps, bottom-up)

| Step | Layer | Files |
|------|-------|-------|
| 1 | Constants | `taskStatus.ts`, `projectStatus.ts`, `priority.ts`, `datePatterns.ts` |
| 2 | Utils | `errors.ts`, `dateTime.ts` |
| 3 | Types | `express.d.ts`, `IUser.ts`, `ITask.ts`, `ICategory.ts`, `IProject.ts`, `IStat.ts`, `IInvalidatedToken.ts` |
| 4 | Models | `User.ts`, `Task.ts`, `Category.ts`, `Project.ts`, `Stat.ts`, `InvalidatedToken.ts` |
| 5 | Config | `env.ts`, `db.ts`, `initialize.ts` |
| 6 | Repositories | All 6 repository files |
| 7 | Validations | All 6 validation files |
| 8 | Services | All 7 service files |
| 9 | Middlewares | `auth.ts`, `errorHandler.ts`, `validate.ts` |
| 10 | Controllers | All 7 controller files |
| 11 | Entry | `libs/aiClient.ts`, routes (7 files), `app.ts`, `server.ts` |

Each step: rename `.js` → `.ts`, add types, verify with `tsx server.ts`.
After all steps pass, remove old `.js` files.

## What This Migration Does NOT Change

- Business logic in any service or controller
- API contracts (routes, status codes, response shapes)
- Database schema or Mongoose configurations
- Error handling flow
- Authentication/authorization logic
- Zod validation schemas (only their inferred types are exported)
