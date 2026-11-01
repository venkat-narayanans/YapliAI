# WhatsApp Message Templates Setup (Meta Cloud API)

To message customers outside the 24-hour service window (for automated reminders, overdue invoices, and win-back offers), Meta requires using pre-approved **Message Templates**.

---

## Where to Create Templates

1. Log in to [Meta Business Suite](https://business.facebook.com/).
2. Navigate to **WhatsApp Manager** $\to$ **Account Tools** $\to$ **Message Templates**.
3. Click **Create Template**.

---

## The 6 Required Templates

### 1. Follow-up Reminder
- **Template Name**: `follow_up_reminder`
- **Category**: Marketing
- **Language**: English (`en`)
- **Body Text**:
  ```text
  Hi {{1}}, just checking in about {{2}}. Want me to hold a slot for you or answer any questions? Reply here anytime.
  ```
- **Sample Variables**:
  - `{{1}}`: `Sarah`
  - `{{2}}`: `Haircut & Styling`

---

### 2. Appointment Reminder (with Quick Reply Buttons)
- **Template Name**: `appointment_reminder`
- **Category**: Utility
- **Language**: English (`en`)
- **Body Text**:
  ```text
  Hi {{1}}, this is a reminder for your {{2}} on {{3}} at {{4}}. Please tap a button below to confirm or reschedule.
  ```
- **Buttons**:
  - Type: **Quick Reply**
  - Button 1 Text: `Confirm`
  - Button 2 Text: `Reschedule`
- **Sample Variables**:
  - `{{1}}`: `Michael`
  - `{{2}}`: `Standard Haircut`
  - `{{3}}`: `Saturday, Nov 2`
  - `{{4}}`: `11:30 AM`

---

### 3. Payment Due (Friendly)
- **Template Name**: `payment_due_friendly`
- **Category**: Utility
- **Language**: English (`en`)
- **Body Text**:
  ```text
  Hi {{1}}, a friendly reminder that invoice {{2}} for {{3}} is due today. You can pay here: {{4}}. Thank you!
  ```
- **Sample Variables**:
  - `{{1}}`: `Jessica`
  - `{{2}}`: `INV-1006`
  - `{{3}}`: `$35.00`
  - `{{4}}`: `https://pay.yapli.ai/inv1006`

---

### 4. Payment Overdue (Firm)
- **Template Name**: `payment_overdue`
- **Category**: Utility
- **Language**: English (`en`)
- **Body Text**:
  ```text
  Hi {{1}}, invoice {{2}} for {{3}} is now overdue. Please complete the payment here: {{4}}. If you have already paid, just reply and we will update it.
  ```
- **Sample Variables**:
  - `{{1}}`: `David`
  - `{{2}}`: `INV-1004`
  - `{{3}}`: `$50.00`
  - `{{4}}`: `https://pay.yapli.ai/inv1004`

---

### 5. Payment Final Notice
- **Template Name**: `payment_final_notice`
- **Category**: Utility
- **Language**: English (`en`)
- **Body Text**:
  ```text
  Hi {{1}}, this is a final reminder for invoice {{2}} ({{3}}). Please pay today using {{4}} or reply to discuss. Our team will call you otherwise.
  ```
- **Sample Variables**:
  - `{{1}}`: `Emma`
  - `{{2}}`: `INV-1005`
  - `{{3}}`: `$50.00`
  - `{{4}}`: `https://pay.yapli.ai/inv1005`

---

### 6. Win-Back Offer (Broadcast Revival)
- **Template Name**: `win_back_offer`
- **Category**: Marketing
- **Language**: English (`en`)
- **Body Text**:
  ```text
  Hi {{1}}! {{2}} It has been a while, so here is something just for you: {{3}}. Reply YES to book, or STOP to opt out.
  ```
- **Sample Variables**:
  - `{{1}}`: `Sarah`
  - `{{2}}`: `Hope your hair color is still holding up nicely!`
  - `{{3}}`: `20% off your next visit this week`

---

## Template Approval & Compliance Tips

1. **Avoid Spammy Formatting**: Do not use excessive capital letters (`FREE! DISCOUNT!`), link shorteners (like `bit.ly`), or all-emoji text. Meta's automated reviewer rejects these.
2. **Opt-Out Compliance**: Marketing templates must include opt-out text (`Reply STOP to opt out`).
3. **Approval Speed**: Utility templates (`appointment_reminder`, `payment_*`) are typically approved within 5 to 15 minutes. Marketing templates take 1 to 4 hours.

