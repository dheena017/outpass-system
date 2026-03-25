from pathlib import Path
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://user:password@localhost:5432/outpass_db"
    database_echo: bool = True

    @field_validator('database_url', mode='before')
    @classmethod
    def use_vercel_postgres(cls, v):
        import os
        # Use POSTGRES_URL if it's available (added by Vercel Postgres)
        return os.environ.get("POSTGRES_URL", v)

    # API
    api_title: str = "Outpass System API"
    api_version: str = "1.0.0"
    debug: bool = True

    # Security
    secret_key: str = "your-secret-key-here-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # CORS
    cors_origins: List[str] | str = ["http://localhost:5174", "http://localhost:3000"]

    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(',')]
        return v

    # Server
    host: str = "0.0.0.0"
    port: int = 8001

    # Email server (fastapi-mail)
    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = "noreply@outpass.com"
    mail_port: int = 587
    mail_server: str = "smtp.gmail.com"
    mail_from_name: str = "Outpass System"
    mail_starttls: bool = True
    mail_ssl_tls: bool = False
    
    # Web Push
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_claims_email: str = ""

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().with_name(".env")),
        case_sensitive=False,
    )


settings = Settings()
