# Yapli AI - Production Cloud Deployment Guide

This guide covers deploying Yapli AI to a production cloud server (VPS) with 24/7 uptime, PostgreSQL database persistence, automated SSL, and multi-tenant client support.

---

## 1. Why Move Off Localhost?

Running n8n locally on your laptop (`http://localhost:5678`) behind ngrok is suitable for testing, but cannot be sold to paying clients because:
1. **Zero Downtime Requirement**: When your laptop sleeps, reboots, or disconnects, the AI Receptionist goes offline. WhatsApp customers messaging at 2:00 AM receive no response.
2. **Ephemeral Webhook URLs**: ngrok free URLs change on restart, breaking Meta Cloud API webhooks.
3. **Database Concurrency**: The default SQLite database locks under concurrent webhook loads. Production requires **PostgreSQL**.

---

## 2. Recommended Hosting Providers ($5–$10/mo)

| Provider | Plan | Specs | Monthly Cost | Location |
|---|---|---|---|---|
| **Hetzner Cloud** | CX22 | 2 vCPU, 4GB RAM, 40GB NVMe | ~€3.80 / mo | Germany / Finland / US |
| **DigitalOcean** | Basic Droplet | 1 vCPU, 2GB RAM, 50GB SSD | $12 / mo | Bangalore / Singapore / US / EU |
| **Linode / Akamai** | Shared | 1 vCPU, 2GB RAM, 50GB SSD | $12 / mo | Mumbai / US / EU |
| **AWS Lightsail** | Standard | 2 vCPU, 2GB RAM, 60GB SSD | $10 / mo | Global |

*Operating System: **Ubuntu 24.04 LTS** (recommended)*

---

## 3. Step-by-Step Deployment Instructions

### Step 1: Point Your Domain DNS
1. Purchase a domain or subdomain (e.g. `app.youragency.com`).
2. Add an **A Record** pointing to your VPS public IPv4 address:
   ```
   Type: A
   Host: app (or @)
   Value: <YOUR_VPS_PUBLIC_IP>
   TTL: 300 (or Auto)
   ```

### Step 2: Install Docker & Docker Compose on VPS
SSH into your server and run:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw

# Configure Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Step 3: Clone Repository and Configure
```bash
git clone <your-repo-url> /opt/yapli-ai
cd /opt/yapli-ai

# Copy production environment template
cp .env.prod.example .env

# Generate a secure 32-byte encryption key
openssl rand -hex 32
# Paste this key into .env as N8N_ENCRYPTION_KEY
```

Edit `.env` with your values:
```bash
nano .env
```
Ensure:
- `DOMAIN=app.youragency.com`
- `POSTGRES_PASSWORD=StrongPasswordHere!`
- `N8N_ENCRYPTION_KEY=Your32ByteHexKey`

### Step 4: Launch Production Stack
```bash
docker compose -f docker-compose.prod.yml up -d
```
Check status:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f caddy
```
Caddy will automatically contact Let's Encrypt, generate a valid TLS certificate, and serve `https://app.youragency.com` with HTTPS enabled.

---

## 4. Automated Database Backups

Create a daily backup script at `/opt/yapli-ai/scripts/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/opt/yapli-ai/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

docker exec yapli_postgres pg_dump -U yapli_admin yapli_n8n | gzip > "$BACKUP_DIR/yapli_backup_$TIMESTAMP.sql.gz"

# Retain backups for 14 days
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +14 -delete
```
Make it executable and add to crontab:
```bash
chmod +x /opt/yapli-ai/scripts/backup.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/yapli-ai/scripts/backup.sh") | crontab -
```

---

## 5. Scaling to Multiple Clients

When you sign a new client:
1. Copy their client details into `clients/<client_id>.json`.
2. Run the provisioner on your server:
   ```bash
   node provision_client.js clients/<client_id>.json
   ```
3. Copy the output webhook URL into Meta Developer Dashboard for their WhatsApp number.
4. The client's workflows are immediately active and isolated in n8n!

