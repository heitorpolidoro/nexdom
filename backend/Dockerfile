FROM python:3.13-slim

# Instala o uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência e instala
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-cache

# Copia o restante do código
COPY . .

# Expõe a porta do FastAPI
EXPOSE 8000

# Comando para rodar as migrações e iniciar o servidor com reload apenas no diretório app
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "app"]
