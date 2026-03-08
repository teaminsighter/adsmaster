from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth, accounts, campaigns, sync, recommendations, meta_auth, meta_campaigns

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
    allow_origins=["http://localhost:3000"],  # Next.js dev server
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


@app.get("/")
async def root():
    return {"message": "AdsMaster API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
