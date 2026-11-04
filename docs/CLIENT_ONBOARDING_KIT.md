# Yapli AI - Client Onboarding & Agency Sales Kit

This kit contains everything you need to pitch, sell, onboard, and retain local businesses (salons, clinics, gyms, real estate agents, coaching centers) on the Yapli AI Automation platform.

---

## 1. Agency Pricing & Packaging Model

Position this not as "software" or "chatbots", but as a **24/7 AI Front-Desk Employee** that never sleeps, never takes sick leave, and costs less than 1/5th of a human receptionist.

| Package | Ideal For | Features Included | Setup Fee (One-Time) | Monthly Retainer |
|---|---|---|---|---|
| **Tier 1: AI Receptionist** | Busy solo operators & boutique studios | • Workflow 1 (24/7 Inbound Receptionist)<br>• Text, voice notes & photo responses<br>• Calendar availability & booking | $149 | $49 / mo |
| **Tier 2: Growth Engine** | Salons, clinics & consultation practices | • Everything in Tier 1<br>• Workflow 2 (Smart Follow-Up Engine)<br>• Workflow 3 (No-Show Killer Reminders)<br>• 1-Tap Confirm/Reschedule | $249 | $99 / mo |
| **Tier 3: Full AI Employee** *(Best Value)* | Established businesses with high booking volume & invoicing | • **All 6 Automations** (1 through 6)<br>• Workflow 4 (Payment Chaser)<br>• Workflow 5 (Broadcast Revival)<br>• Workflow 6 (Daily 10 PM Owner Report) | $399 | $149 / mo |

---

## 2. Sales Pitch & Closing Script

### The Opening Hook: "The 10 PM WhatsApp Test"
1. Find 5 local salons, clinics, or coaching centers on Google Maps or Instagram.
2. At 9:30 PM or 10:00 PM, send their WhatsApp Business number a message:
   > *"Hi, do you have any haircut/consultation openings this Saturday afternoon, and what are your rates?"*
3. Most will either **not reply until the next afternoon** or **never reply at all**.
4. Screenshot their delayed reply (or silence). That is your opening hook:
   > *"Hey [Owner Name], I messaged your salon last night at 9:30 PM asking to book an appointment. If I was an eager customer ready to pay, I likely would have booked with the competitor down the street who answered first.*
   >
   > *We built Yapli AI to fix this. It answers within 5 seconds, speaks fluent English/Hindi/regional languages, understands voice notes, and books them right onto your calendar—even at 2:00 AM."*

### The 7-Day Free Trial Offer
> *"I don't want you to pay me a dime today. Let me set it up on your number for 7 days completely free. Every night at 10 PM, you'll receive a Daily Owner Report on your own WhatsApp showing exactly how many chats were answered, leads captured, and bookings made while you slept. If it doesn't bring you at least 3 extra bookings, we disconnect it and you owe nothing."*

---

## 3. Client Onboarding Questionnaire

When a client agrees to the 7-day trial or signs up, send them this 5-minute intake form:

```text
BUSINESS INTAKE FORM - YAPLI AI

1. Business Name: ____________________________________
2. Business Category: [ ] Salon/Spa  [ ] Clinic  [ ] Gym  [ ] Real Estate  [ ] Other: _______
3. City & Address: ____________________________________
4. Operating Hours:
   - Monday - Saturday: _______________________________
   - Sunday: [ ] Open: ___________ [ ] Closed
5. WhatsApp Business Phone Number: ___________________
6. Owner's Personal WhatsApp Number (for Daily Reports): ___________________
7. Owner's Telegram ID (optional, for urgent human handoffs): ___________________
8. Top 5 Most Common Customer Questions & Answers:
   Q1: _________________________________________________
   A1: _________________________________________________
   Q2: _________________________________________________
   A2: _________________________________________________
9. Service & Price List (or attach menu/brochure PDF):
   - Service 1: ____________________ Price: ___________
   - Service 2: ____________________ Price: ___________
   - Service 3: ____________________ Price: ___________
10. Cancellation & Rescheduling Policy: ____________________________________
```

---

## 4. Master Google Sheet CRM Blueprint

Create a master Google Sheet template named `Yapli CRM - [Business Name]` with these tabs:

### Tab 1: `Business Info` (FAQ & Services Knowledge Base)
The AI reads this in real-time on every customer inquiry. Any change made by the owner takes effect immediately!

| topic | answer |
|---|---|
| `services` | Consultation, Standard Haircut, Premium Styling, Beard Grooming |
| `pricing` | Consultation is free, Standard Haircut is $25, Premium Styling is $50 |
| `timing` | Monday to Saturday from 9:00 AM to 6:00 PM. Closed Sundays. |
| `address` | 123 Grand Trunk Road, Suite 4B, Chennai |
| `parking` | Free valet parking available in front of the building |
| `cancellation` | Free cancellation up to 2 hours before the scheduled time |
| `tone` | Warm, welcoming, and polite (or "casual and upbeat with emojis") |
| `language` | Auto-detect (or "Tamil", "Hindi", "English only") |
| `greeting` | Vanakkam! Welcome to Glow Studio. How can we make your day great? |
| `escalation` | If customer mentions "complaint", "manager", or "refund", hand off to owner |

### Tab 2: `AI Settings` (Optional dedicated tab for advanced fine-tuning)
| setting | value | description |
|---|---|---|
| `ai_tone` | `friendly_casual` | professional / friendly_casual / warm_enthusiastic |
| `preferred_language` | `auto` | auto / English / Tamil / Hindi |
| `max_followups` | `2` | Maximum follow-up nudges before pausing |
| `appointment_buffer_min` | `30` | Minimum minutes between appointments |
| `after_hours_auto_reply` | `active` | Auto-inform customer that team is off-hours |

### Tab 3: `Leads`
| phone | name | interest | status | last_message_at | followups_sent | last_followup_at |
|---|---|---|---|---|---|---|
| `15551234567` | `Alex Smith` | `Haircut & Styling` | `hot` | `2026-11-01 10:00` | `0` | `` |

### Tab 3: `Reminders`
| date | phone | name | appointment | status |
|---|---|---|---|---|
| `2026-11-02 10:00` | `15551234567` | `Alex Smith` | `Signature Haircut` | `Pending` |

### Tab 4: `Invoices`
| invoice_no | customer_name | phone | amount | due_date | payment_link | status | stage_sent | last_reminder_at |
|---|---|---|---|---|---|---|---|---|
| `INV-1006` | `Alex Smith` | `15551234567` | `$35.00` | `2026-11-02` | `https://pay.yapli.ai/inv1006` | `pending` | `Draft` | `` |

### Tab 5: `Customers`
| phone | name | last_purchase | last_visit | opted_in | last_campaign_at |
|---|---|---|---|---|---|
| `15551234567` | `Alex Smith` | `Deluxe Haircut & Scalp Spa` | `2026-08-15` | `Yes` | `` |

---

## 5. Instant Client Provisioning Flow

Once the client fills the form:
1. Create a duplicate of the Master Google Sheet and share it with the client.
2. In Meta Business Manager, add their phone number and retrieve the `Phone Number ID`.
3. Create `clients/<client_id>.json`:
   ```json
   {
     "clientId": "bella_salon",
     "businessName": "Bella Salon",
     "businessType": "Hair & Beauty Salon",
     "city": "Chennai",
     "sheetId": "<THEIR_GOOGLE_SHEET_ID>",
     "whatsappPhoneId": "<THEIR_WHATSAPP_PHONE_ID>",
     "ownerWhatsAppNumber": "<OWNER_PHONE>",
     "telegramChatId": "<OWNER_TELEGRAM_ID>",
     "calendarId": "primary"
   }
   ```
4. Run the automated provisioner:
   ```bash
   node provision_client.js clients/bella_salon.json
   ```
5. Paste the generated webhook URL into Meta Developer Dashboard.
6. The client is live in **under 2 minutes**!

