"""Application configuration module."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    PROJECT_NAME: str = "SIGECON"
    ENVIRONMENT: str = "production"

    # Database
    DB_HOST: str
    DB_PORT: str
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str
    SQL_ECHO: bool = False

    @property
    def database_url(self) -> str:
        """
        Construct the database URL from components.

        Returns:
            str: The full PostgreSQL connection string.
        """
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    # Security
    SECRET_KEY: str
    SECRET_KEYS: list[str] = []
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5175", "http://127.0.0.1:5175"]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
