from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Runtime (async) — asyncpg
    database_url: str = "postgresql+asyncpg://linko:linko@localhost:5432/linko"
    # Alembic (sync) — psycopg. Must be sync because alembic env uses engine_from_config.
    alembic_database_url: str = "postgresql+psycopg://linko:linko@localhost:5432/linko"


settings = Settings()
