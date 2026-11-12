from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

from core.api import router
from core.database import Base, SessionLocal, engine
from core.seed import seed


def migrate_legacy_blob_table() -> None:
    """Preserve the prototype JSON table before creating the normalized schema."""
    inspector = inspect(engine)
    if "projects" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("projects")}
    if columns == {"id", "data", "updated_at"}:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE projects RENAME TO legacy_project_blobs"))


@asynccontextmanager
async def lifespan(_: FastAPI):
    migrate_legacy_blob_table()
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(
    title="Milestone API",
    version="1.0.0",
    description="Human-approved freelance agreement, delivery, payment and resolution workflows.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)

dist = ROOT / "frontend" / "dist"
if dist.exists():
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        target = dist / path
        return FileResponse(target if target.is_file() else dist / "index.html")
