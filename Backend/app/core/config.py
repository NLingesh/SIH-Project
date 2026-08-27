from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import List, Union
import os
import json


class Settings(BaseSettings):
    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")
    cors_origins_raw: str = Field(default="http://localhost:3000,http://localhost:5173", alias="CORS_ORIGINS")

    @property
    def cors_origins(self) -> List[str]:
        raw = self.cors_origins_raw
        if isinstance(raw, list):
            return raw
        if isinstance(raw, str):
            raw = raw.strip()
            if raw.startswith("["):
                try:
                    return json.loads(raw)
                except:
                    pass
            return [s.strip() for s in raw.split(",") if s.strip()]
        return ["http://localhost:3000", "http://localhost:5173"]

    database_url: str = Field(default="postgresql+asyncpg://darktrace:darktrace@localhost:5432/darktrace", alias="DATABASE_URL")
    database_url_sync: str = Field(default="postgresql://darktrace:darktrace@localhost:5432/darktrace", alias="DATABASE_URL_SYNC")

    neo4j_uri: str = Field(default="bolt://localhost:7687", alias="NEO4J_URI")
    neo4j_username: str = Field(default="neo4j", alias="NEO4J_USERNAME")
    neo4j_password: str = Field(default="darktrace123", alias="NEO4J_PASSWORD")

    jwt_secret: str = Field(default="your-super-secret-jwt-key-change-in-production-min-32-chars", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(default=480, alias="JWT_EXPIRE_MINUTES")

    upload_dir: str = Field(default="/app/uploads", alias="UPLOAD_DIR")
    max_file_size: int = Field(default=52428800, alias="MAX_FILE_SIZE")

    demo_mode: bool = Field(default=True, alias="DEMO_MODE")
    seed_demo_data: bool = Field(default=True, alias="SEED_DEMO_DATA")

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()