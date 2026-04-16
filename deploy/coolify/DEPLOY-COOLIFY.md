# AdsMaster Deployment Guide - Coolify on Hostinger VPS

This guide covers deploying AdsMaster using Coolify on a Hostinger VPS with a subdomain.

## Prerequisites

- Hostinger VPS with Ubuntu 22.04 LTS (minimum 2GB RAM, 2 vCPU)
- Root/sudo SSH access to your VPS
- Domain with subdomain pointed to VPS IP (e.g., `app.yourdomain.com`, `api.yourdomain.com`)
- Your GCP service account JSON file

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Hostinger VPS                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Coolify                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  PostgreSQL │  │    Redis    │  │   Traefik   │ │   │
│  │  │   :5432     │  │    :6379    │  │  (Reverse   │ │   │
│  │  └─────────────┘  └─────────────┘  │   Proxy)    │ │   │
│  │                                     └─────────────┘ │   │
│  │  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │  API        │  │    Web      │                   │   │
│  │  │  (FastAPI)  │  │  (Next.js)  │                   │   │
│  │  │  :8081      │  │   :3000     │                   │   │
│  │  └─────────────┘  └─────────────┘                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

External Access:
  app.yourdomain.com → Web (:3000)
  api.yourdomain.com → API (:8081)
```

---

## Step 1: Install Coolify on Hostinger VPS

### 1.1 SSH into your VPS

```bash
ssh root@your-vps-ip
```

### 1.2 Install Coolify (one-liner)

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

This will:
- Install Docker
- Install Coolify
- Set up automatic SSL via Traefik
- Create admin account

### 1.3 Access Coolify Dashboard

After installation completes:
1. Open `http://your-vps-ip:8000` in browser
2. Create your admin account
3. Complete the initial setup wizard

---

## Step 2: Configure DNS

Add these DNS records in Hostinger DNS settings:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | app | YOUR_VPS_IP | 3600 |
| A | api | YOUR_VPS_IP | 3600 |
| A | coolify | YOUR_VPS_IP | 3600 |

Wait 5-10 minutes for DNS propagation.

---

## Step 3: Push Code to Git Repository

### 3.1 Create GitHub/GitLab repository

Create a new private repository (e.g., `adsmaster`)

### 3.2 Push your code

```bash
cd /path/to/adsmaster
git init
git add .
git commit -m "Initial commit"
git remote add origin git@github.com:YOUR_USERNAME/adsmaster.git
git push -u origin main
```

---

## Step 4: Deploy Database (PostgreSQL)

### 4.1 In Coolify Dashboard

1. Go to **Projects** → **Add New Project** → Name it "AdsMaster"
2. Click on the project → **Add New Resource** → **Database** → **PostgreSQL**

### 4.2 Configure PostgreSQL

- **Name**: adsmaster-db
- **PostgreSQL Version**: 15
- **Database Name**: adsmaster
- **Username**: adsmaster
- **Password**: (generate a strong password, save it!)

3. Click **Deploy**

### 4.3 Get Database Connection Details

After deployment, click on the database to get:
- Internal URL: `postgresql://adsmaster:PASSWORD@adsmaster-db:5432/adsmaster`

---

## Step 5: Deploy Redis

### 5.1 Add Redis

1. In your AdsMaster project → **Add New Resource** → **Database** → **Redis**

### 5.2 Configure Redis

- **Name**: adsmaster-redis
- **Redis Version**: 7

3. Click **Deploy**

### 5.3 Get Redis Connection

- Internal URL: `redis://adsmaster-redis:6379`

---

## Step 6: Initialize Database Schema

### 6.1 SSH into VPS and access PostgreSQL

```bash
# Find the PostgreSQL container ID
docker ps | grep postgres

# Copy the init script
scp deploy/coolify/init_database.sql root@your-vps-ip:/tmp/

# On the VPS, run the init script
docker exec -i POSTGRES_CONTAINER_ID psql -U adsmaster -d adsmaster < /tmp/init_database.sql
```

Or via Coolify UI:
1. Click on PostgreSQL database
2. Go to **Terminal** tab
3. Run: `psql -U adsmaster -d adsmaster`
4. Paste contents of `init_database.sql`

---

## Step 7: Upload GCP Credentials

### 7.1 Create credentials directory on VPS

```bash
ssh root@your-vps-ip
mkdir -p /data/coolify/credentials
```

### 7.2 Upload your GCP service account JSON

```bash
scp credentials/gcp-service-account.json root@your-vps-ip:/data/coolify/credentials/
```

---

## Step 8: Deploy Backend API

### 8.1 Add API Service

1. In AdsMaster project → **Add New Resource** → **Application** → **GitHub/GitLab**
2. Connect your repository
3. Select branch: `main`

### 8.2 Configure Build Settings

- **Build Pack**: Dockerfile
- **Dockerfile Location**: `deploy/coolify/api.Dockerfile`
- **Base Directory**: `/` (root)
- **Port**: 8081

### 8.3 Configure Domain

- **Domain**: `api.yourdomain.com`
- Enable **HTTPS** (Coolify handles SSL automatically)

### 8.4 Configure Environment Variables

Add these environment variables:

```env
# Database (use internal Coolify URL)
DATABASE_URL=postgresql://adsmaster:YOUR_DB_PASSWORD@adsmaster-db:5432/adsmaster

# Redis
REDIS_URL=redis://adsmaster-redis:6379

# JWT (generate with: openssl rand -hex 32)
JWT_SECRET=your_64_character_random_string_here

# Google Ads
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_REDIRECT_URI=https://app.yourdomain.com/auth/google-ads/callback

# Meta Ads
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_REDIRECT_URI=https://app.yourdomain.com/auth/meta/callback

# AI
GEMINI_API_KEY=your_gemini_api_key

# GCP (BigQuery/Vertex AI)
GCP_PROJECT_ID=adsmaster-492611
GCP_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/data/coolify/credentials/gcp-service-account.json
BIGQUERY_DATASET=adsmaster_ml

# Stripe (add later when ready)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# App URLs
ENVIRONMENT=production
DEBUG=false
CORS_ORIGINS=https://app.yourdomain.com
API_URL=https://api.yourdomain.com
WEB_URL=https://app.yourdomain.com
```

### 8.5 Configure Volumes

Add a volume mount for GCP credentials:
- **Source**: `/data/coolify/credentials`
- **Destination**: `/app/credentials`
- **Read Only**: Yes

### 8.6 Deploy

Click **Deploy** and wait for build to complete.

### 8.7 Verify API

```bash
curl https://api.yourdomain.com/health
# Should return: {"status":"healthy"}
```

---

## Step 9: Deploy Frontend

### 9.1 Add Web Service

1. In AdsMaster project → **Add New Resource** → **Application** → **GitHub/GitLab**
2. Select same repository
3. Select branch: `main`

### 9.2 Configure Build Settings

- **Build Pack**: Dockerfile
- **Dockerfile Location**: `deploy/coolify/web.Dockerfile`
- **Base Directory**: `/` (root)
- **Port**: 3000

### 9.3 Configure Domain

- **Domain**: `app.yourdomain.com`
- Enable **HTTPS**

### 9.4 Configure Build Arguments

Add build argument:
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 9.5 Configure Environment Variables

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 9.6 Deploy

Click **Deploy** and wait for build to complete.

### 9.7 Verify Frontend

Open `https://app.yourdomain.com` in browser.

---

## Step 10: Update OAuth Redirect URIs

### Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project (adsmaster-492611)
3. Edit OAuth 2.0 Client
4. Add Authorized redirect URIs:
   - `https://app.yourdomain.com/auth/google-ads/callback`
   - `https://app.yourdomain.com/auth/callback`

### Meta Developer Console

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Select your app
3. Go to Facebook Login → Settings
4. Add Valid OAuth Redirect URIs:
   - `https://app.yourdomain.com/auth/meta/callback`

---

## Step 11: Configure Stripe Webhooks (When Ready)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://api.yourdomain.com/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## Monitoring & Logs

### View Logs in Coolify

1. Click on any service (API or Web)
2. Go to **Logs** tab
3. Stream logs in real-time

### SSH Access

```bash
# View API logs
docker logs -f $(docker ps -q -f name=adsmaster-api)

# View Web logs
docker logs -f $(docker ps -q -f name=adsmaster-web)

# View PostgreSQL logs
docker logs -f $(docker ps -q -f name=adsmaster-db)
```

---

## Updating the Application

### Automatic Deployments

1. In Coolify, go to service settings
2. Enable **Auto Deploy** on push to main branch
3. Every git push will trigger a new deployment

### Manual Deployment

1. Push changes to Git
2. In Coolify, click **Redeploy** on the service

---

## Backup Database

### Manual Backup

```bash
# On VPS
docker exec $(docker ps -q -f name=adsmaster-db) \
  pg_dump -U adsmaster adsmaster > backup_$(date +%Y%m%d).sql
```

### Automated Backups (Cron)

```bash
# Add to crontab (daily at 2 AM)
0 2 * * * docker exec $(docker ps -q -f name=adsmaster-db) pg_dump -U adsmaster adsmaster | gzip > /data/backups/db_$(date +\%Y\%m\%d).sql.gz
```

---

## Troubleshooting

### API not starting

```bash
# Check logs
docker logs $(docker ps -q -f name=adsmaster-api) --tail 100

# Common issues:
# - DATABASE_URL incorrect
# - Missing environment variables
# - GCP credentials not mounted
```

### Frontend build fails

```bash
# Check build logs in Coolify
# Common issues:
# - NEXT_PUBLIC_API_URL not set as build arg
# - Node modules cache issue (try clearing and rebuilding)
```

### Database connection refused

```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec -it $(docker ps -q -f name=adsmaster-db) psql -U adsmaster -d adsmaster -c "SELECT 1;"
```

### SSL certificate issues

Coolify uses Traefik with Let's Encrypt. If SSL fails:
1. Verify DNS is pointing to VPS IP
2. Wait for DNS propagation
3. In Coolify, click "Generate Certificate" again

---

## Security Checklist

- [ ] Changed JWT_SECRET to random 64-char string
- [ ] Strong PostgreSQL password
- [ ] GCP credentials file permissions (read-only)
- [ ] CORS_ORIGINS only includes your domain
- [ ] Firewall configured (Coolify manages this)
- [ ] SSL enabled on all domains
- [ ] Regular database backups configured

---

## Cost Estimate (Hostinger VPS)

- **VPS KVM 2** (2 vCPU, 4GB RAM): ~$8.99/month
- **Domain** (if needed): ~$10/year
- **Total**: ~$10/month

This setup can handle ~1000 daily active users comfortably.
