# =============================================================================
# AdsMaster API - FastAPI Backend
# =============================================================================
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY pyproject.toml ./

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install \
    fastapi>=0.115.0 \
    "uvicorn[standard]>=0.34.0" \
    sqlalchemy>=2.0.0 \
    psycopg2-binary>=2.9.0 \
    asyncpg>=0.29.0 \
    python-dotenv>=1.0.0 \
    pydantic>=2.0.0 \
    pydantic-settings>=2.0.0 \
    httpx>=0.28.0 \
    redis>=5.0.0 \
    pyjwt>=2.8.0 \
    google-ads>=25.0.0 \
    google-generativeai>=0.8.0 \
    openai>=1.0.0 \
    anthropic>=0.30.0 \
    passlib>=1.7.4 \
    bcrypt>=4.0.0 \
    python-multipart>=0.0.6

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
