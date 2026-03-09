import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env from project root
try:
    from dotenv import load_dotenv
    # Find the project root (where .env file is)
    current_dir = Path(__file__).resolve().parent
    project_root = current_dir.parent.parent.parent  # apps/api/app -> apps/api -> apps -> root
    env_file = project_root / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        print(f"Loaded environment from {env_file}")
    else:
        # Try current working directory
        load_dotenv()
except ImportError:
    print("python-dotenv not installed, environment variables must be set manually")

from .api import auth, accounts, campaigns, sync, recommendations, meta_auth, meta_campaigns, demo, admin_settings, ai_chat, audiences

app = FastAPI(
    title="AdsMaster API",
    description="AI-powered Google & Meta Ads management platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(campaigns.router)
app.include_router(sync.router)
app.include_router(recommendations.router)
app.include_router(meta_auth.router)
app.include_router(meta_campaigns.router)
app.include_router(demo.router)
app.include_router(admin_settings.router)
app.include_router(ai_chat.router)
app.include_router(audiences.router)


@app.get("/")
async def root():
    return {"message": "AdsMaster API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
