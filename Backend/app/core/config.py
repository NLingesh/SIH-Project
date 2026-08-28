import json
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


DEFAULT_JWT_SECRET = "your-super-secret-jwt-key-change-in-production-min-32-chars"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")
    cors_origins_raw: str = Field(default="http://localhost:3000,http://localhost:5173", alias="CORS_ORIGINS")

    @property
    def cors_origins(self) -> List[str]:
        raw = self.cors_origins_raw.strip()
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except (TypeError, ValueError):
                pass
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    database_url: str = Field(default="postgresql+asyncpg://darktrace:darktrace@localhost:5432/darktrace", alias="DATABASE_URL")
    database_url_sync: str = Field(default="postgresql://darktrace:darktrace@localhost:5432/darktrace", alias="DATABASE_URL_SYNC")

    neo4j_uri: str = Field(default="bolt://localhost:7687", alias="NEO4J_URI")
    neo4j_username: str = Field(default="neo4j", alias="NEO4J_USERNAME")
    neo4j_password: str = Field(default="darktrace123", alias="NEO4J_PASSWORD")

    jwt_secret: str = Field(default=DEFAULT_JWT_SECRET, alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(default=480, alias="JWT_EXPIRE_MINUTES")

    upload_dir: str = Field(default="/app/uploads", alias="UPLOAD_DIR")
    max_file_size: int = Field(default=52428800, alias="MAX_FILE_SIZE")

    demo_mode: bool = Field(default=True, alias="DEMO_MODE")
    seed_demo_data: bool = Field(default=True, alias="SEED_DEMO_DATA")

    def validate_runtime(self) -> None:
        environment = self.app_env.strip().lower()
        if self.app_port < 1 or self.app_port > 65535:
            raise ValueError("APP_PORT must be between 1 and 65535")
        if self.jwt_expire_minutes <= 0:
            raise ValueError("JWT_EXPIRE_MINUTES must be greater than zero")
        if self.max_file_size <= 0:
            raise ValueError("MAX_FILE_SIZE must be greater than zero")
        if not self.cors_origins:
            raise ValueError("CORS_ORIGINS must contain at least one origin")
        if environment in {"production", "staging"}:
            if self.jwt_secret == DEFAULT_JWT_SECRET or len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be a unique value of at least 32 characters outside development")
            if "*" in self.cors_origins:
                raise ValueError("Wildcard CORS origins are not allowed outside development")


settings = Settings()
