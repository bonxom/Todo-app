# TodoApp Frontend

The modern, performant, and type-safe frontend for TodoApp, built with **React 19**, **Vite**, **TypeScript**, **React Router v7**, **TanStack Query v5**, **Zustand**, and **TailwindCSS**.

For detailed architectural guidelines and design principles, see [docs/architecture.md](./docs/architecture.md).

---

## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm >= 9

### Installation
```bash
pnpm install
```

### Running Locally
```bash
# Start Vite development server (port 5000)
pnpm dev
```

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts the local development server at `http://localhost:5000` |
| `pnpm test` | Runs the Vitest unit & integration test suite |
| `pnpm test:watch` | Runs Vitest in interactive watch mode |
| `pnpm test:e2e` | Runs Playwright browser automation tests |
| `pnpm typecheck` | Runs TypeScript compilation checks (`tsc -b`) |
| `pnpm lint` | Runs ESLint across the codebase |
| `pnpm build` | Typechecks and creates the production bundle in `dist/` |
| `pnpm preview` | Previews the production build locally |
| `pnpm create-feature <name>` | Scaffolds a new feature directory adhering to architecture standards |

---

## Architectural Highlights

- **Domain Feature Ownership**: Source code is organized by domain in `src/features/` with isolated routes, queries, and components.
- **Client vs. Server State Separation**: Zustand strictly manages client state (`useAuthStore`, `useTaskFilterStore`), while React Query owns server state caching and synchronization.
- **Render-Blocking Session Cache Boundary**: Guarantees zero cross-user query cache contamination on login/logout/session switch.
- **Optimistic Calendar Mutations**: Drag-and-drop deadline changes and task status updates provide instantaneous feedback with automatic rollback on server error.
- **Route-Level Code Splitting**: Features are lazily loaded on navigation via React Router data router.
