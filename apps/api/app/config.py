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


settings = Settings()
