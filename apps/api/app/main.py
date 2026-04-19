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

from .api import auth, accounts, campaigns, sync, recommendations, meta_auth, meta_campaigns, demo, admin_settings, ai_chat, audiences, settings, user_auth, automations, admin
from .api import admin_marketing, admin_ai, admin_api_monitor, admin_system, admin_emails, ml, webhooks
from .api import tracking, visitors, offline_conversions, webhooks_ingest, sync_logs, session_recordings, studio, domains, crm_integrations
# from .api import conversion_import, live_debug  # Requires python-multipart (Python 3.10+)
from .api import ad_insights, click_analytics, product_analytics, search_console
from .api import ad_goals  # Sprint 8: Ad Goals & Alerts
from .services.ga4_service import router as ga4_router

app = FastAPI(
    title="AdsMaster API",
    description="AI-powered Google & Meta Ads management platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware - read from env for production, fallback to localhost for dev
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    cors_origins = [origin.strip() for origin in cors_origins_env.split(",")]
else:
    cors_origins = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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
app.include_router(settings.router)
app.include_router(user_auth.router)
app.include_router(automations.router)
app.include_router(admin.router)
app.include_router(admin_marketing.router)
app.include_router(admin_ai.router)
app.include_router(admin_api_monitor.router)
app.include_router(admin_system.router)
app.include_router(admin_emails.router)
app.include_router(ml.router)
app.include_router(webhooks.router)

# Tracking & Conversions (Phase 1-2)
app.include_router(tracking.router)
app.include_router(visitors.router)
app.include_router(offline_conversions.router)
app.include_router(webhooks_ingest.router)
app.include_router(sync_logs.router)
app.include_router(session_recordings.router)
app.include_router(studio.router)
app.include_router(domains.router)
app.include_router(crm_integrations.router)

# Sprint 6: Enhanced Conversions
# app.include_router(conversion_import.router)  # Requires python-multipart
# app.include_router(live_debug.router)  # Requires python-multipart

# Sprint 7: Analytics Enhancements
app.include_router(ad_insights.router)
app.include_router(click_analytics.router)
app.include_router(product_analytics.router)
app.include_router(search_console.router)
app.include_router(ga4_router)

# Sprint 8: Ad Goals & Alerts
app.include_router(ad_goals.router)


@app.on_event("startup")
async def create_admin_from_env():
    """Create or update admin user from environment variables on startup."""
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")

    if not admin_email or not admin_password:
        print("ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping admin creation")
        return

    try:
        import bcrypt
        from .services.supabase_client import get_supabase_client

        supabase = get_supabase_client()

        # Hash password with bcrypt
        password_hash = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt(12)).decode()

        # Check if admin exists
        existing = supabase.table("admin_users").select("id").eq("email", admin_email).execute()

        if existing.data:
            # Update existing admin - reset password
            supabase.table("admin_users").update({
                "password_hash": password_hash,
                "is_active": True,
                "role": "super_admin",
            }).eq("email", admin_email).execute()
            print(f"Updated admin user: {admin_email}")
        else:
            # Create new admin
            import uuid
            supabase.table("admin_users").insert({
                "id": str(uuid.uuid4()),
                "email": admin_email,
                "name": "Admin",
                "password_hash": password_hash,
                "role": "super_admin",
                "is_active": True,
            }).execute()
            print(f"Created admin user: {admin_email}")
    except Exception as e:
        print(f"Failed to create admin user: {e}")


@app.get("/")
async def root():
    return {"message": "AdsMaster API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
