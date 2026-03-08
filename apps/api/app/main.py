from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AdsMaster API",
    description="AI-powered Google & Meta Ads management platform",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "AdsMaster API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
