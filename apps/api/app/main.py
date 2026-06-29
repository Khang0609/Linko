from fastapi import FastAPI

from app.exceptions import register_exception_handlers
from app.routers import businesses

app = FastAPI(title="Linko API", version="0.1.0")
register_exception_handlers(app)
app.include_router(businesses.router, prefix="/api/v1/businesses", tags=["businesses"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
