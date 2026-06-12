# 🗺️ Meridian Project Standards — Nexdom

> Last initialized: 2026-05-08

---

## 🎯 Project Overview

**nexdom** is a full-stack task management system with role-based access control (RBAC), audit trails, and i18n support. The UI is in Portuguese (pt-BR primary, en fallback).

| Layer | Technology |
|-------|------------|
| Backend | Python 3.13 · FastAPI 0.136 · SQLModel · Alembic · uvicorn |
| Frontend | React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4 · TanStack Query 5 |
| Database | PostgreSQL 16 |
| Auth | JWT (python-jose) · bcrypt (passlib) · slowapi rate limiting |
| UI Components | Radix UI primitives wrapped in shadcn-style components |
| Package Managers | `uv` (backend) · `npm` (frontend) |
| Containerization | Docker · Docker Compose |

---

## 🛠️ Critical Commands

### Backend

```bash
cd backend
uv sync --all-groups                              # Install all dependencies
uv run uvicorn app.main:app --reload              # Dev server (hot reload)
uv run pytest --cov=app --cov-report=xml          # Tests + coverage
uv run alembic upgrade head                       # Apply migrations
uv run alembic revision --autogenerate -m "msg"  # Create migration
```

### Frontend

```bash
cd frontend
npm ci                    # Clean install
npm run dev               # Vite dev server → http://localhost:5173
npm run build             # TypeScript check + production build
npm run test              # Vitest (single run)
npm run test:coverage     # Coverage report
npm run lint              # ESLint
```

### Docker Compose

```bash
docker-compose up --build          # Start all services
docker-compose up backend          # Backend only
docker-compose down -v             # Stop and remove volumes
docker-compose logs -f backend     # Stream backend logs
```

---

## 🏗️ Structure & Navigation

```
nexdom/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # Route handlers (auth, tasks, users)
│   │   ├── core/               # Config, security, exceptions, rate limiting
│   │   ├── models/             # SQLModel table definitions + enums
│   │   ├── schemas/            # Pydantic I/O schemas (separate from models)
│   │   ├── services/           # Business logic layer
│   │   ├── db.py               # Engine, session factory, get_session()
│   │   └── main.py             # FastAPI app init + middleware
│   ├── alembic/versions/       # Database migration files
│   └── tests/                  # Pytest test suite
└── frontend/
    └── src/
        ├── features/           # Feature-scoped modules (pages, components, hooks)
        │   ├── user-administration/
        │   └── task-management/
        ├── components/ui/      # Shared Radix/shadcn UI primitives
        ├── api/                # Axios client + interceptors
        ├── hooks/              # Shared custom hooks
        ├── i18n/locales/       # en.json + pt.json translation files
        └── types/              # Shared TypeScript types
```

**Architectural pattern:** Layered backend (endpoints → services → models → db) + Feature-based frontend.

---

## 📏 Golden Rules

### Backend

1. **Schemas ≠ Models.** SQLModel table classes live in `models/`; Pydantic I/O schemas live in `schemas/`. Never return a table model directly from an endpoint.
2. **Domain exceptions only.** Raise `DomainError` subclasses (`TaskNotFoundError`, `ForbiddenError`). Never raise raw `HTTPException` inside services.
3. **Soft delete, never hard delete tasks.** Set `is_deleted = True`; never `DELETE FROM tasks`.
4. **Audit every task mutation.** All field changes must produce a `TaskHistory` record.
5. **No hardcoded secrets.** All secrets and DB credentials must come from environment variables via `core/config.py` (Pydantic BaseSettings).
6. **Migrations for every schema change.** Use Alembic. Never mutate the DB manually in production.
7. **Dependency injection via `Depends()`.** Pass `session` and `current_user` via FastAPI DI; never import them as globals.
8. **JWT is stateless.** No server-side session storage. Token expiry: 30 min default, 7 days with "remember me".

### Frontend

1. **Feature-scoped by default.** New pages, components, and hooks belong inside `src/features/<feature>/` unless explicitly shared.
2. **Shared UI only in `components/ui/`.** Radix/shadcn wrappers go there. No business logic in UI primitives.
3. **Server state via TanStack Query.** Use `useQuery`/`useMutation`; do not manage async fetch state manually with `useState`.
4. **No token in component state.** Auth token lives in `sessionStorage` (primary) / `localStorage` (remember-me). The `AuthContext` is the single source of truth.
5. **All user-facing strings must be translated.** Use `i18next` `t()` — no hardcoded English/Portuguese strings in JSX.
6. **Protected routes via `<ProtectedRoute>`.** Never conditionally render pages based on role inside the component itself.
7. **Axios client is the only HTTP entry point.** Import from `api/client.ts`; never use `fetch` directly.

### Universal

- Follow the global standards in `.meridian/core/global.md` (SRP, DRY, KISS, no secrets, fail safely).
- No feature flags or backward-compat shims — change the code.
- No `console.log` or `print` debug statements committed to `master`.

---

## 🧪 Quality & Workflow

### Coverage Thresholds (enforced by CI)

| Layer | Threshold |
|-------|-----------|
| Backend (pytest-cov) | ≥ 90% overall |
| Frontend lines/functions/statements | ≥ 75% |
| Frontend branches | ≥ 70% |

### CI Pipeline (`.github/workflows/ci.yml`)

Triggers on push/PR to `master`.

1. **Backend Tests** — `uv` + Python 3.13 → pytest + coverage artifact
2. **Frontend Tests** — Node 24 → `npm ci` + `npm run test:coverage` + lcov artifact
3. **SonarCloud Scan** — depends on both; requires `SONAR_TOKEN` secret

**A PR cannot be merged if CI fails or coverage thresholds drop.**

### Test Strategy

- **Backend:** In-memory SQLite via fixtures (`session_fixture`, `client_fixture`). Rate limiting disabled in test environment. Fixtures for `admin_user_fixture` and `normal_user_fixture` (DIRECTOR role).
- **Frontend:** jsdom environment, `@testing-library/react`, mocked API calls. Setup in `src/test/setup.ts`.

### Code Quality Gates

- **Ruff** (backend): `select = ["ALL"]` with per-file ignores — must pass before commit.
- **ESLint** (frontend): React hooks + React Refresh plugins — must pass before commit.
- **SonarCloud** + **DeepSource**: Monitored on every merge to `master`.

### Roles in Use

| Enum | Values |
|------|--------|
| `UserRole` | `ADMINISTRATOR`, `DIRECTOR` |
| `TaskStatus` | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELED` |
| `TaskPriority` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
