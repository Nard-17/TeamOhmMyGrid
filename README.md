# KuryenTipid

**Mitigating Bill Shock Through AI-Driven Proactive Budgeting and Conversational Energy Analytics**

**Team Name:** Ohm My Grid  
**Members:** Jaeda Marthena Iral, Carl Benedict Enriquez, Jacob Antonio Uzel, Hector Escobido, Lenard Cato Narvaza  

*Note: This project is based on the proposal detailed in the "MERALCO Hackathon.pdf" document.*

---

## 📖 About the App

**The Problem**  
In July of 2026, numerous complaints surfaced online regarding sudden electricity consumption spikes, with bills reaching triple their usual amounts. Despite statements and explanations from Meralco on the recent bill increases, consumers still struggle to understand their electricity usage and billing mechanics. 

**Our Solution**  
To bridge this gap, **KuryenTipid** is proposed as an innovative, AI-driven mobile application concept designed to transform reactive electricity billing into a proactive, transparent, and conversational experience. KuryenTipid provides complete billing transparency alongside smart solutions to actively help consumers manage and reduce their electricity consumption.

## ✨ Key Features

- **Autonomous Budget Agent:** Users can set a strict monthly budget ceiling (e.g., ₱3,500). The AI continuously monitors real-time smart-meter data and proactively sends voice alerts to suggest immediate behavioral changes—such as adjusting an air conditioner's eco-timer—*before* the budget limit is breached.
- **Conversational Bill Walkthrough:** Transforms static billing statements into interactive, voice-guided summaries available in English or Taglish. It explains the exact reasons for month-over-month cost fluctuations on a line-by-line basis.
- **"What-If" Watt-Calculator:** An interactive simulator that allows users to ask conversational questions (e.g., "How much will I save this month if I change my AC from $20^{\circ}C$ to $24^{\circ}C$?") to accurately forecast financial savings before making physical adjustments to their appliances.
- **Peak-Hour Alerts & Load Scheduling:** Integrates with Meralco's grid demand signals to notify users during periods of high grid strain, encouraging mindful consumption.

---

## 🔐 Authentication System (Registration & Login)

KuryenTipid includes a production-grade, secure authentication system built with **React Native (Expo)** and **Supabase (PostgreSQL)**, adhering to strict validation standards, cybersecurity best practices, and anti-enumeration defenses.

### 1. Registration Form Fields & Validation Rules

| Field | Validation & Format Rule | Database Constraint |
| :--- | :--- | :--- |
| **Full Name** | Required text field; alphabetic characters and spaces only, minimum 2 characters (`^[A-Za-z ]{2,80}$`). | `chk_full_name_alpha_only` |
| **Username** | Required unique identifier; alphanumeric, 4–20 characters, no spaces (`^[a-zA-Z0-9]{4,20}$`). | `UNIQUE`, `chk_username_alphanumeric` |
| **Email Address** | Required unique field; must follow standard RFC 5322 email formatting (`user@domain.com`). | `UNIQUE`, `chk_email_format` |
| **Customer and Account Number (CAN)** | Required unique field; **exactly 10 numeric digits** (e.g., `1234567890` or `1234-5678-90`). Validated against existing Meralco utility customer records (`meralco_customers` table). | `UNIQUE`, `chk_can_format`, `FOREIGN KEY` |
| **Password** | Required field; minimum 8 characters, must contain at least one letter (`[a-zA-Z]`) and one number (`[0-9]`). Includes visual real-time password strength meter scoring uppercase and special symbols. | Supabase GoTrue Bcrypt/Argon2 hashing |
| **Confirm Password** | Must match the Password field exactly to prevent typographical errors. | Client-side & server assertion |

### 2. Multi-Identifier Login Functionality

- **Flexible Multi-Identifier Input:** Users can seamlessly log in using their **Email**, **Username**, or **CAN (Customer Account Number)** alongside their Password.
- **Live Identifier Detection:** The UI dynamically detects whether the user is typing an Email (`✉️`), a 10-digit CAN (`💳`), or a Username (`👤`).
- **Account Enumeration Defense:** Failed login attempts consistently return the **exact same generic error message** (`"Invalid credentials. Please verify your identifier and password."`) regardless of whether the account does not exist or the password was incorrect. Constant-time comparison prevents timing attacks.
- **Brute-Force Rate Limiting:** Limits failed login attempts to a maximum of **5 attempts per 15-minute window**. If exceeded, the system locks out further attempts and displays a real-time countdown timer before retrying.

### 3. Database Schema & Security Best Practices

The database architecture is defined in [`supabase/schema.sql`](file:///c:/Users/Jaeda/Documents/TeamOhmMyGrid/supabase/schema.sql) and [`supabase/seed.sql`](file:///c:/Users/Jaeda/Documents/TeamOhmMyGrid/supabase/seed.sql):

- **Tables:**
  - `public.meralco_customers`: Official utility customer database storing 10-digit CANs, formatted SINs (`1234-5678-90`), customer names, service addresses, and registration status.
  - `public.profiles`: User profiles extending `auth.users` with `UNIQUE` constraints on `email`, `username`, and `can`.
  - `public.auth_rate_limits`: Tracks authentication attempts for IP and identifier rate limiting.
  - `public.auth_audit_log`: Security audit trail recording registration, successful logins, failed attempts, and rate-limit triggers.
- **Row Level Security (RLS):** RLS is enabled on all tables. Users may only read and edit their own profile and linked utility records.
- **Stored Functions & RPCs:**
  - `check_can_eligibility(p_can, p_full_name)`: Validates CAN against official records and prevents duplicate claims.
  - `check_rate_limit(p_identifier, p_ip)`: Prevents brute-force attacks by verifying attempt thresholds.
  - `record_auth_attempt(p_identifier, p_ip, p_success)`: Logs authentication results and cleans old records.
  - `resolve_login_identifier(p_identifier)`: Resolves Username or CAN to user email for Supabase Auth without leaking enumeration data.
  - `handle_new_user()` trigger: Automatically syncs new accounts from `auth.users` into `public.profiles`.

---

## ⚡ Quick Start & Testing

### Running Automated Test Suite

We have created an automated test suite covering all 24 validation rules, edge cases, rate limiting, and security invariants:

```bash
npm test
```

### Running the App

1. **Web Preview (Instant Browser Access):**
   ```bash
   npm run web
   ```
2. **Mobile Device (Expo Go / Simulator):**
   ```bash
   npx expo start
   ```

### Pre-Seeded Meralco Demo Accounts

During registration or login testing, you can use any of these pre-seeded customer accounts (also available via the **⚡ Demo Accounts** modal in the app):

| Account Holder | 10-Digit CAN | SIN (on bill) | Default Status |
| :--- | :--- | :--- | :--- |
| **Nena Villanueva** | `1234567890` | `1234-5678-90` | Available for Registration |
| **Jaeda Marthena Iral** | `1234567891` | `1234-5678-91` | Available for Registration |
| **Carl Benedict Enriquez** | `1234567892` | `1234-5678-92` | Available for Registration |
| **Jacob Antonio Uzel** | `1234567893` | `1234-5678-93` | Available for Registration |
| **Hector Escobido** | `1234567894` | `1234-5678-94` | Available for Registration |
| **Lenard Cato Narvaza** | `1234567895` | `1234-5678-95` | Available for Registration |

---

## 🌐 Connecting to Live Supabase

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. In your [Supabase Dashboard](https://supabase.com/dashboard):
   - Navigate to **SQL Editor** and execute [`supabase/schema.sql`](file:///c:/Users/Jaeda/Documents/TeamOhmMyGrid/supabase/schema.sql) followed by [`supabase/seed.sql`](file:///c:/Users/Jaeda/Documents/TeamOhmMyGrid/supabase/seed.sql).
   - Go to **Project Settings -> API** and copy your **Project URL** and **anon public key**.
3. Paste the credentials into `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
*Note: If no `.env` credentials are provided, KuryenTipid automatically runs on its local, zero-config engine with AsyncStorage persistence and identical PostgreSQL validation rules.*

---

**References**  
Lectura, L., & Mayuga, J. L. (2026, July 9). *Complaints vs electricity bills spike prompt Meralco to review system.* Business Mirror.
