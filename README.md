# Yapli AI — 24/7 AI WhatsApp Employee & Automation Hub 🚀

> An autonomous 24/7 AI Employee on WhatsApp that captures leads, answers customer queries in under 5 seconds, books appointments, chases unpaid invoices, and revives quiet customers for local businesses.

---

## 🌟 Overview

**Yapli AI** provides local service businesses (salons, clinics, consulting, auto repair, and contractors) with an automated operations system built on **n8n**, **Meta WhatsApp Cloud API**, and **Google Gemini 3.8 Flash**.

The platform includes:
1. **6 Automated Business Workflows** running in n8n.
2. **Multi-Tenant Client Provisioner** (`provision_client.js`) that deploys a new client setup in under 10 seconds.
3. **Modern Web Platform & Owner Dashboard** (`web/index.html`) featuring an interactive WhatsApp simulator, ROI calculator, and real-time CRM controls.
4. **Production Deployment Suite** (`docker-compose.prod.yml`, Caddy SSL reverse proxy, and system architecture guides).

---

## ⚙️ The 6 Automation Engines

| Engine | Name | Trigger | Description |
| :---: | :--- | :--- | :--- |
| **01** | **WhatsApp AI Receptionist** | Inbound WhatsApp Webhook | Multi-language AI receptionist powered by Gemini 3.8 Flash. Transcribes voice notes, reads product photos, answers FAQs from Google Sheets, and saves qualified leads. |
| **02** | **Smart Follow-Up Engine** | Cron (Hourly) | Auto-nudges warm leads who asked for prices but didn't book. Adapts dynamically inside and outside WhatsApp's 24-hour window. |
| **03** | **No-Show Killer (Reminders)** | Daily (6:00 PM) | Dispatches interactive WhatsApp reminders for tomorrow's bookings with 1-tap `[Confirm]` and `[Reschedule]` buttons. |
| **04** | **Payment & Invoice Chaser** | Daily (11:00 AM) | 3-stage automated payment reminder sequence (Friendly $\to$ Firm $\to$ Final Notice) with instant payment links. |
| **05** | **Broadcast Revival (Win-Back)** | Weekly (Monday Noon) | Re-engages customers who haven't visited in 60+ days with personalized offers in rate-limited batches. |
| **06** | **Daily Owner Digest** | Daily (10:00 PM) | Sends the business owner a WhatsApp executive briefing with today's revenue, new leads, and tomorrow's calendar. |

---

## 🏗️ Architecture

```
               [ WhatsApp Customer ]
                        │
                        ▼
           [ Meta WhatsApp Cloud API ]
                        │
                        ▼ (Public Webhook)
         [ n8n Workflow Automation Hub ]
          ├── WF1: AI Receptionist (Gemini 3.8 Flash)
          ├── WF2: Smart Follow-Up
          ├── WF3: Appointment Reminders
          ├── WF4: Payment Chaser
          ├── WF5: Customer Win-Back
          └── WF6: Nightly Owner Digest
                        │
       ┌────────────────┴────────────────┐
       ▼                                 ▼
[ Google Sheets CRM ]           [ Owner Operations Hub ]
(5-Tab Database)                (Web Platform: Port 3000)
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- Docker & Docker Compose (for local or cloud n8n deployment)
- Meta WhatsApp Cloud API Account
- Google Gemini API Key

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/VenkatNaryanan/YapliAI.git
cd YapliAI

# Install dependencies
npm install

# Configure environment
cp .env.prod.example .env
```

### 3. Start Local Web Platform & Dashboard
```bash
npm start
# Opens at: http://localhost:3000
```

### 4. Test Workflows
```bash
# Run unified test suite
npm test

# Test a specific workflow (1 to 6)
npm run test:1
```

### 5. Multi-Tenant Client Onboarding & Management

#### A. Interactive CLI Onboarding (5 Questions)
```bash
# Answer 5 prompts to register and deploy a client in 10s:
npm run onboard

# Dry-run validation without deploying to n8n:
npm run onboard:dry
```

#### B. Client Management CLI
```bash
# List all registered clients with status & tier:
npm run clients

# View business MRR and conversion stats:
npm run clients:stats

# View detailed config for a client:
node clients.js info glow_studio

# Pause or Resume all workflows for a client:
node clients.js deactivate glow_studio
node clients.js activate glow_studio
```

#### C. Web Agency Hub (Browser GUI)
Open `http://localhost:3000` and click **Agency Clients** in the top navigation bar to manage all clients, view live MRR, and provision new businesses directly from the browser!

#### D. Zero-Code Client Customizations via Google Sheet
Business owners customize their own AI without bugging you:
- **FAQs, Prices & Services**: Owner edits `Business Info` tab $\to$ Gemini reads it in real-time.
- **Tone, Language & Greeting**: Owner edits `AI Settings` tab $\to$ AI instantly switches persona (e.g. from English to Tamil, or Professional to Bubbly).

---

## 📂 Project Structure

```
YapliAI/
├── clients/                  # Client configuration profiles
│   └── sample_salon.json
├── docs/                     # Production guides & onboarding kits
│   ├── CLIENT_ONBOARDING_KIT.md
│   ├── PRODUCTION_DEPLOYMENT_GUIDE.md
│   └── WHATSAPP_TEMPLATES_SETUP.md
├── templates/                # Parameterized n8n workflow templates (1-6)
├── web/                      # Web platform & owner dashboard
│   └── index.html            # Marketing landing page + Owner CRM
├── Caddyfile                 # Caddy reverse proxy config with automatic SSL
├── docker-compose.prod.yml   # Production Docker compose (n8n + Postgres + Caddy)
├── n8n.js                    # Programmatic n8n client & CLI
├── package.json              # NPM scripts and configuration
├── provision_client.js       # Client onboarding CLI
├── server.js                 # Lightweight HTTP server
├── test.js                   # Unified workflow test harness
└── workflow[1-6].json        # Base workflow configurations
```

---

## 📄 License
MIT License. Built by the Yapli AI Team.

