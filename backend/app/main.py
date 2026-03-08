from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import brew_methods, catalog, preferences, user_beans

app = FastAPI(title="Coffee Coach API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(brew_methods.router)
app.include_router(catalog.router)
app.include_router(user_beans.router)
app.include_router(preferences.router)


@app.get("/health")
def health():
    return {"status": "ok"}
