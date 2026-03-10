# AdsMaster Deployment Guide

## Coolify Deployment (Recommended)

### Prerequisites
- Coolify installed on your VPS
- Domain configured (e.g., `adsmaster.yourdomain.com`)
- Git repository (GitHub/GitLab)

---

### Step 1: Push to Git Repository

```bash
cd /path/to/adsmaster
git init  # if not already a repo
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/adsmaster.git
git push -u origin main
```

---

### Step 2: Create Services in Coolify

In Coolify, you'll create **4 services**:

#### 2.1 PostgreSQL Database
1. Go to Coolify Dashboard → **Resources** → **+ New**
2. Select **Database** → **PostgreSQL**
3. Configure:
   - Name: `adsmaster-db`
   - Version: `16`
   - Database: `adsmaster`
   - Username: `adsmaster`
   - Password: *(generate secure password)*
4. Deploy

#### 2.2 Redis
1. **Resources** → **+ New** → **Database** → **Redis**
2. Configure:
   - Name: `adsmaster-redis`
   - Version: `7`
3. Deploy

#### 2.3 API Backend
1. **Resources** → **+ New** → **Application**
2. Select your Git repository
3. Configure:
   - Name: `adsmaster-api`
   - Branch: `main`
   - Build Pack: **Dockerfile**
   - Dockerfile Location: `apps/api/Dockerfile.prod`
   - Port: `8000`
   - Domain: `api.yourdomain.com`

4. Add Environment Variables:
   ```
   DATABASE_URL=postgresql+asyncpg://adsmaster:PASSWORD@adsmaster-db:5432/adsmaster
   REDIS_URL=redis://adsmaster-redis:6379
   JWT_SECRET=your-super-secret-key-minimum-32-characters
   GEMINI_API_KEY=your-gemini-key
   OPENAI_API_KEY=your-openai-key
   ANTHROPIC_API_KEY=your-anthropic-key
   GOOGLE_ADS_DEVELOPER_TOKEN=
   GOOGLE_ADS_CLIENT_ID=
   GOOGLE_ADS_CLIENT_SECRET=
   META_APP_ID=
   META_APP_SECRET=
   ```

5. Deploy

#### 2.4 Web Frontend
1. **Resources** → **+ New** → **Application**
2. Select your Git repository
3. Configure:
   - Name: `adsmaster-web`
   - Branch: `main`
   - Build Pack: **Dockerfile**
   - Dockerfile Location: `apps/web/Dockerfile.prod`
   - Port: `3000`
   - Domain: `yourdomain.com`

4. Add Build Arguments:
   ```
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

5. Deploy

---

### Step 3: Initialize Database

After PostgreSQL is running, connect and run the init script:

**Option A: Via Coolify Terminal**
1. Click on `adsmaster-db` → **Terminal**
2. Run:
   ```bash
   psql -U adsmaster -d adsmaster -f /docker-entrypoint-initdb.d/001_schema.sql
   ```

**Option B: Via psql from your machine**
```bash
# Get the connection string from Coolify
psql "postgresql://adsmaster:PASSWORD@your-vps-ip:5432/adsmaster" -f database/init/001_schema.sql
```

---

### Step 4: SSL Certificates

Coolify handles SSL automatically via Let's Encrypt. Ensure:
- Domain DNS points to your VPS IP
- Ports 80 and 443 are open

---

### Step 5: Test Deployment

```bash
# Test API health
curl https://api.yourdomain.com/health

# Test registration
curl -X POST https://api.yourdomain.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"SecurePass123","full_name":"Admin","organization_name":"My Agency"}'

# Visit frontend
open https://yourdomain.com
```

---

## Manual Docker Deployment (Alternative)

If not using Coolify, deploy with docker-compose:

```bash
# On your VPS
git clone https://github.com/yourusername/adsmaster.git
cd adsmaster

# Create .env from example
cp .env.example .env
nano .env  # Edit with your values

# Start production stack
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_USER` | Yes | Database username |
| `POSTGRES_PASSWORD` | Yes | Database password |
| `POSTGRES_DB` | Yes | Database name |
| `DATABASE_URL` | Yes | Full PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | Secret for JWT tokens (min 32 chars) |
| `GEMINI_API_KEY` | No* | Google Gemini API key |
| `OPENAI_API_KEY` | No* | OpenAI API key |
| `ANTHROPIC_API_KEY` | No* | Anthropic Claude API key |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | No | For Google Ads integration |
| `GOOGLE_ADS_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_ADS_CLIENT_SECRET` | No | Google OAuth client secret |
| `META_APP_ID` | No | Meta/Facebook App ID |
| `META_APP_SECRET` | No | Meta/Facebook App Secret |

*At least one AI provider key is recommended for AI features.

---

## Backup & Restore

### Backup Database
```bash
docker exec adsmaster-db pg_dump -U adsmaster adsmaster > backup.sql
```

### Restore Database
```bash
cat backup.sql | docker exec -i adsmaster-db psql -U adsmaster adsmaster
```

---

## Troubleshooting

### API not starting
```bash
docker logs adsmaster-api
```

### Database connection issues
```bash
# Check if PostgreSQL is running
docker exec adsmaster-db pg_isready -U adsmaster

# Test connection from API container
docker exec adsmaster-api python -c "from app.services.database import engine; print(engine.connect())"
```

### Frontend build failing
```bash
docker logs adsmaster-web
# Check Next.js build output
```
