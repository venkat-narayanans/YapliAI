#!/usr/bin/env bash
# ==============================================================================
# Yapli AI - Master Oracle Cloud Always Free Automated Setup Script
# ==============================================================================
# Run this script on a fresh Ubuntu 22.04 or 24.04 instance on Oracle Cloud.
# It installs Docker, opens Oracle iptables/ports, sets up the anti-idle
# daemon, configures nightly backups, and boots up n8n + PostgreSQL + Caddy.
#
# Usage:
#   chmod +x deploy/setup_oracle.sh
#   sudo ./deploy/setup_oracle.sh <your-domain.com>
# ==============================================================================

set -e

DOMAIN="${1}"

if [ -z "$DOMAIN" ]; then
    echo "⚠️ No domain passed. Usage: sudo ./deploy/setup_oracle.sh <your-domain.com>"
    echo "Using default fallback: n8n.youragency.com"
    DOMAIN="n8n.youragency.com"
fi

echo "======================================================"
echo "🚀 Starting Yapli AI Oracle Cloud Production Setup"
echo "   Target Domain: $DOMAIN"
echo "======================================================"

# 1. Update OS packages
echo "1. Updating system packages..."
apt-get update && apt-get install -y curl git ufw iptables-persistent cron jq openssl

# 2. Open Oracle Cloud OS Firewall (Crucial: Oracle Ubuntu has strict iptables by default)
echo "2. Configuring firewall and opening Ports 80 & 443..."
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
netfilter-persistent save || true

# Configure UFW
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

# 3. Install Docker & Docker Compose
echo "3. Installing Docker and Docker Compose plugin..."
if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

systemctl enable docker
systemctl start docker

# 4. Setup Oracle Anti-Idle Keep-Alive Daemon
echo "4. Installing anti-idle keepalive daemon to protect from 7-day reclamation..."
KEEPALIVE_PATH="/usr/local/bin/oracle-keepalive.sh"
cp deploy/oracle-keepalive.sh "$KEEPALIVE_PATH"
chmod +x "$KEEPALIVE_PATH"

# Add keepalive to crontab (every 30 mins)
(crontab -l 2>/dev/null | grep -v "oracle-keepalive.sh" ; echo "*/30 * * * * $KEEPALIVE_PATH > /dev/null 2>&1") | crontab -

# 5. Setup Automated Nightly Backups
echo "5. Installing automated nightly backup cron (Runs at 3:00 AM IST)..."
BACKUP_PATH="/usr/local/bin/yapli-backup.sh"
cp deploy/backup.sh "$BACKUP_PATH"
chmod +x "$BACKUP_PATH"

(crontab -l 2>/dev/null | grep -v "yapli-backup.sh" ; echo "0 3 * * * cd $(pwd) && $BACKUP_PATH > /var/log/yapli-backup.log 2>&1") | crontab -

# 6. Configure Environment
echo "6. Configuring production .env file..."
if [ ! -f .env ]; then
    cp deploy/.env.production.example .env
    sed -i "s/n8n.youragency.com/$DOMAIN/g" .env
    RANDOM_PASS=$(openssl rand -hex 16)
    sed -i "s/YapliProdSecurePass_2026!/$RANDOM_PASS/g" .env
fi

# 7. Start Containers
echo "7. Launching n8n, PostgreSQL, and Caddy..."
export DOMAIN="$DOMAIN"
docker compose up -d

echo "======================================================"
echo "🎉 YAPLI AI CLOUD STACK IS LIVE!"
echo "======================================================"
echo "Next Steps:"
echo "1. Verify DNS: Ensure '$DOMAIN' points to this server's public IP."
echo "2. Open Dashboard: Visit https://$DOMAIN to complete first-time n8n owner login."
echo "3. Generate n8n API Key: Go to Settings -> n8n API -> Create API Key."
echo "4. Add API Key to .env: Set N8N_API_KEY in .env and run:"
echo "     node sync_workflows.js"
echo "======================================================"
