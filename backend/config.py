from pathlib import Path
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://user:password@localhost:5432/outpass_db"
    database_echo: bool = True

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

    # Geofence — campus center and allowed radius (meters)
    campus_latitude: float = 13.0125
    campus_longitude: float = 80.0215
    geofence_radius_meters: int = 5000  # 5km default

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().with_name(".env")),
        case_sensitive=False,
    )


settings = Settings()
