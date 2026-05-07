from app.api.v1.api import api_router
from app.core.config import settings
from app.core.exception_handlers import domain_exception_handler
from app.core.exceptions import DomainError
from app.core.limiter import limiter
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded


def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:  # noqa: ARG001
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"error": "Rate limit exceeded", "detail": exc.detail},
    )


app = FastAPI(title=settings.PROJECT_NAME)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
app.add_exception_handler(DomainError, domain_exception_handler)

# CORS Configuration
raw_origins = settings.BACKEND_CORS_ORIGINS
if isinstance(raw_origins, str):
    import json

    try:
        origins = json.loads(raw_origins)
    except json.JSONDecodeError:
        origins = [o.strip() for o in raw_origins.split(",")]
else:
    origins = [str(o) for o in raw_origins]

# Ensure frontend dev server is included
frontend_dev = "http://localhost:5175"
if frontend_dev not in [o.strip("/") for o in origins]:
    origins.append(frontend_dev)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"message": "Welcome to SIGECON API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
