from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Runtime (async) — asyncpg
    database_url: str = "postgresql+asyncpg://linko:linko@localhost:5432/linko"
    # Alembic (sync) — psycopg. Must be sync because alembic env uses engine_from_config.
    alembic_database_url: str = "postgresql+psycopg://linko:linko@localhost:5432/linko"
    # Issue #7: keep contacts optional for M1, but make it configurable for product review.
    person_required: bool = False
    idempotency_ttl_seconds: int = 60 * 60 * 24
    frontend_origin: str = "http://localhost:5173"
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 30

    # Issue #10: Smart Analyzer configuration
    gemini_project: str | None = Field(default=None, validation_alias="vertex_project")
    gemini_region: str = Field(default="asia-southeast1", validation_alias="vertex_location")
    gemini_model: str = Field(default="gemini-2.5-flash-lite", validation_alias="gemini_model")
    analyzer_timeout_seconds: float = Field(default=5.0, validation_alias="analyzer_deadline_seconds")
    analyzer_provider_timeout_seconds: float = Field(
        default=4.25,
        validation_alias="analyzer_provider_timeout_seconds",
    )
    analyzer_provider: str = "mock"

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_must_be_strong(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters.")
        return value


settings = Settings()
