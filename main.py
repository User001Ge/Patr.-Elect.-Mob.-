from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from data_loader import PreferenceFileError
from schemas import SimulationRequest
from services import build_simulation_payload, ensure_data_file_exists, get_model_overview

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
INDEX_FILE = STATIC_DIR / "index.html"

app = FastAPI(
    title="Election Simulator",
    description="FastAPI backend + mobile-first frontend for the election simulator.",
    version="1.1.0",
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
def startup_check() -> None:
    ensure_data_file_exists()
    if not INDEX_FILE.exists():
        raise FileNotFoundError(f"Frontend file ვერ მოიძებნა: {INDEX_FILE}")


@app.exception_handler(PreferenceFileError)
async def preference_file_error_handler(_, exc: PreferenceFileError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(FileNotFoundError)
async def file_not_found_handler(_, exc: FileNotFoundError):
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.exception_handler(ValueError)
async def value_error_handler(_, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "მოთხოვნის მონაცემები არასწორია.",
            "errors": exc.errors(),
        },
    )


@app.get("/")
def frontend() -> FileResponse:
    return FileResponse(INDEX_FILE)


@app.get("/api")
def api_root() -> dict[str, object]:
    return {
        "message": "Election simulator API is running.",
        "docs": "/docs",
        "available_endpoints": ["GET /health", "GET /model", "POST /simulate"],
    }


@app.get("/health")
def health() -> dict[str, str]:
    ensure_data_file_exists()
    return {"status": "ok"}


@app.get("/model")
def model_overview() -> dict[str, object]:
    return get_model_overview()


@app.post("/simulate")
def simulate(request: SimulationRequest) -> dict[str, object]:
    try:
        return build_simulation_payload(request)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"სიმულაციის გაშვებისას დაფიქსირდა შეცდომა: {exc}") from exc
