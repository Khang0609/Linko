from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.analyzer.router import router as analyzer_router
from app.config import settings
from app.exceptions import register_exception_handlers
from app.matching.router import router as matching_router
from app.routers import auth, businesses, needs, offers, persons, reference

app = FastAPI(title="Linko API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_exception_handlers(app)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(businesses.router, prefix="/api/v1/businesses", tags=["businesses"])
app.include_router(offers.router, prefix="/api/v1", tags=["offers"])
app.include_router(needs.router, prefix="/api/v1", tags=["needs"])
app.include_router(persons.router, prefix="/api/v1", tags=["persons"])
app.include_router(reference.router, prefix="/api/v1/reference", tags=["reference"])
app.include_router(analyzer_router, prefix="/api/v1", tags=["analyzer"])
app.include_router(matching_router, prefix="/api/v1", tags=["matching"])



@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
