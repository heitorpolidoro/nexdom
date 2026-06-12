# CLAUDE.md — nexdom

Sistema de gestão de condomínios e associações.

- **Repo:** https://github.com/heitorpolidoro/nexdom
- **Frontend (prod):** https://nexdom-front.vercel.app
- **Backend (prod):** https://nexdom-back.vercel.app

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python 3.13, FastAPI, SQLModel (SQLAlchemy), Alembic, Passlib/JWT |
| Frontend | React 19, TypeScript, Vite, TanStack Query, React Router, Radix UI, Tailwind CSS, i18next |
| Banco | PostgreSQL 16 |
| Deploy | Vercel (front: `nexdom-front`, back: `nexdom-back`) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| Qualidade | SonarCloud (`heitorpolidoro_nexdom`), DeepSource, Ruff (Python), ESLint (TS) |

---

## Estrutura

```
nexdom/
├── backend/          # FastAPI app
│   ├── app/
│   │   ├── api/v1/   # Routers REST
│   │   ├── core/     # Config, auth, exceptions, limiter
│   │   ├── models/   # SQLModel models
│   │   ├── schemas/  # Pydantic schemas
│   │   └── services/ # Business logic
│   ├── tests/
│   └── pyproject.toml
├── frontend/         # React app
│   ├── src/
│   │   ├── api/      # Axios clients
│   │   ├── components/
│   │   ├── features/ # Feature modules
│   │   ├── hooks/
│   │   └── types/
│   └── package.json
├── docker-compose.yml
├── sonar-project.properties
└── package.json      # Vercel preview scripts
```

---

## Comandos

### Backend
```bash
cd backend
uv sync --all-groups          # instalar deps
uv run uvicorn app.main:app --reload --port 8001
uv run pytest --cov=app tests/
uv run ruff check .
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # porta 3000
npm run test:coverage
```

### Docker (tudo junto)
```bash
docker compose up --build
# backend → localhost:8001
# frontend → localhost:3001
# postgres → localhost:5436
```

### Deploy preview (Vercel)
```bash
npm run preview:back    # deploy preview do backend
npm run preview:front   # deploy preview do frontend
```

---

## Variáveis de ambiente

### `backend/.env` (desenvolvimento)
```
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/nexdom
SECRET_KEY=dev_secret_key_change_me_in_production
ENVIRONMENT=development
```

### `frontend/.env.local`
```
VITE_API_URL=http://localhost:8001/api/v1
```

### Produção (Vercel)
- `VITE_API_URL=https://nexdom-back.vercel.app/api/v1` (env do projeto `nexdom-front`)
- Demais secrets no Vercel dashboard e GitHub Secrets (`VERCEL_TOKEN`, `SONAR_TOKEN`)

---

## Convenções

- **Branches:** `master` (principal)
- **Linting:** Ruff para Python (`line-length = 88`); ESLint para TS
- **Testes:** pytest (backend), Vitest (frontend)
- **Migrations:** Alembic em `backend/alembic/`
- **i18n:** `react-i18next` — traduções em `frontend/src/i18n/`
- **Rate limiting:** `slowapi` no backend
- **Auth:** JWT via `python-jose`, hash de senha com `passlib[bcrypt]`
