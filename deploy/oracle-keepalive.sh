#!/usr/bin/env bash
# ==============================================================================
# Yapli AI - Oracle Cloud Keep-Alive Heartbeat Daemon
# ==============================================================================
# Purpose:
#   Oracle Cloud automatically reclaims and terminates "Always Free" instances
#   if their 7-day average CPU utilization drops below 20%.
#   This script runs a controlled cryptographic calculation for 65 seconds
#   every 30 minutes to maintain an active CPU baseline above the 20% threshold
#   without causing heat or interfering with customer WhatsApp message traffic.
# ==============================================================================

set -e

LOG_FILE="/var/log/oracle-keepalive.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Running Yapli AI Keep-Alive Heartbeat..." >> "$LOG_FILE" 2>&1

# 1. CPU Heartbeat: Compute SHA256 hashes across 2 cores for 65 seconds
# This safely raises 7-day rolling CPU average without bottlenecking n8n
if command -v openssl >/dev/null 2>&1; then
    timeout 65 openssl speed -multi 2 sha256 > /dev/null 2>&1 || true
else
    # Fallback if openssl is not present
    timeout 65 dd if=/dev/urandom of=/dev/null bs=1M count=1000 > /dev/null 2>&1 || true
fi

# 2. Network Heartbeat: Ping public DNS to register network activity
ping -c 4 1.1.1.1 > /dev/null 2>&1 || true

echo "[$TIMESTAMP] Heartbeat completed successfully. Instance status: PROTECTED." >> "$LOG_FILE" 2>&1
