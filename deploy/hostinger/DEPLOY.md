# AdsMaster Deployment Guide - Hostinger VPS

This guide covers deploying AdsMaster on Hostinger VPS with PostgreSQL.

## Prerequisites

- Hostinger VPS with Ubuntu 22.04 LTS
- Root/sudo access via SSH
- Domain pointed to your VPS IP
- PostgreSQL database

## Step 1: Initial VPS Setup

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y git curl wget nginx certbot python3-certbot-nginx

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Python 3.11 & pip
apt install -y python3.11 python3.11-venv python3-pip

# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Install PostgreSQL (if not using Hostinger's managed DB)
apt install -y postgresql postgresql-contrib

# Install Redis (optional - for caching)
apt install -y redis-server
systemctl enable redis-server
```

## Step 2: Create Application User

```bash
# Create user for the app
adduser adsmaster
usermod -aG sudo adsmaster

# Switch to app user
su - adsmaster
```

## Step 3: Setup PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE adsmaster;
CREATE USER adsmaster_user WITH ENCRYPTED PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE adsmaster TO adsmaster_user;
ALTER USER adsmaster_user CREATEDB;
\q
```

## Step 4: Clone & Setup Application

```bash
# As adsmaster user
cd /home/adsmaster

# Clone your repository
git clone https://github.com/your-repo/adsmaster.git
cd adsmaster

# Create credentials directory
mkdir -p credentials
# Upload your gcp-service-account.json here

# Copy and edit environment file
cp deploy/hostinger/.env.production .env
nano .env  # Edit with your values

# Setup Backend
cd apps/api
poetry install --no-dev

# Setup Frontend
cd ../web
npm install
npm run build

# Initialize database
cd /home/adsmaster/adsmaster
PGPASSWORD=your_password psql -h localhost -U adsmaster_user -d adsmaster -f deploy/hostinger/init_database.sql
```

## Step 5: Configure Systemd Services

### Backend API Service

```bash
sudo nano /etc/systemd/system/adsmaster-api.service
```

```ini
[Unit]
Description=AdsMaster FastAPI Backend
After=network.target postgresql.service

[Service]
User=adsmaster
Group=adsmaster
WorkingDirectory=/home/adsmaster/adsmaster/apps/api
Environment="PATH=/home/adsmaster/.local/bin:/usr/bin"
EnvironmentFile=/home/adsmaster/adsmaster/.env
ExecStart=/home/adsmaster/.local/bin/poetry run uvicorn app.main:app --host 127.0.0.1 --port 8081 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Frontend Service (using PM2)

```bash
# Install PM2
sudo npm install -g pm2

# Start Next.js
cd /home/adsmaster/adsmaster/apps/web
pm2 start npm --name "adsmaster-web" -- start

# Save PM2 config
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

### Enable Services

```bash
sudo systemctl daemon-reload
sudo systemctl enable adsmaster-api
sudo systemctl start adsmaster-api
sudo systemctl status adsmaster-api
```

## Step 6: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/adsmaster
```

```nginx
# API Backend
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/adsmaster /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 7: SSL Certificates (Let's Encrypt)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Step 8: Update OAuth Redirect URIs

### Google Cloud Console
Add these redirect URIs:
- `https://yourdomain.com/auth/google-ads/callback`
- `https://yourdomain.com/auth/callback`

### Meta Developer Console
Add these redirect URIs:
- `https://yourdomain.com/auth/meta/callback`

## Step 9: Firewall Setup

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Useful Commands

```bash
# View API logs
sudo journalctl -u adsmaster-api -f

# View frontend logs
pm2 logs adsmaster-web

# Restart services
sudo systemctl restart adsmaster-api
pm2 restart adsmaster-web

# Update application
cd /home/adsmaster/adsmaster
git pull
cd apps/api && poetry install
cd ../web && npm install && npm run build
sudo systemctl restart adsmaster-api
pm2 restart adsmaster-web
```

## Troubleshooting

### API not starting
```bash
# Check logs
sudo journalctl -u adsmaster-api -n 100

# Test manually
cd /home/adsmaster/adsmaster/apps/api
poetry run uvicorn app.main:app --host 127.0.0.1 --port 8081
```

### Database connection issues
```bash
# Test connection
PGPASSWORD=your_password psql -h localhost -U adsmaster_user -d adsmaster -c "SELECT 1;"
```

### Frontend build errors
```bash
cd /home/adsmaster/adsmaster/apps/web
npm run build 2>&1 | head -50
```

## Backups

```bash
# Database backup
pg_dump -U adsmaster_user -d adsmaster > backup_$(date +%Y%m%d).sql

# Automated daily backups (add to crontab)
0 2 * * * pg_dump -U adsmaster_user -d adsmaster | gzip > /home/adsmaster/backups/db_$(date +\%Y\%m\%d).sql.gz
```

## Security Checklist

- [ ] Changed default admin password
- [ ] Changed JWT_SECRET to random 64-char string
- [ ] PostgreSQL only accepts local connections
- [ ] UFW firewall enabled
- [ ] SSL certificates installed
- [ ] Disabled root SSH login
- [ ] Set up fail2ban
