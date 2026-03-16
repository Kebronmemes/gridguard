# ⚡ GridGuard — Ethiopia Outage Intelligence Platform

A production-grade, full-stack electricity outage management system built for Ethiopian Electric Utility (EEU).

## ✨ Features

- 🗺️ **Real interactive map** — Leaflet.js + CartoDB tiles, just like Google Maps
- 📍 **Geolocation** — asks permission, shows your location, finds nearby outages
- 🔴 **Animated outage markers** — pulse rings, color-coded by type, report counts
- 🔥 **Heatmap overlay** — visualize outage severity areas
- 📊 **Live dashboard** — stats, crew status, 7-day history
- 👥 **Citizen reporting** — submit outages with email/SMS alerts
- 📧 **Email notifications** — via Resend API (real emails)
- 💬 **SMS alerts** — via Twilio API (real SMS)
- ⚙️ **EEU Staff Portal** — schedule maintenance, verify reports, dispatch crews, analytics
- 🌐 **Multi-language SMS** — English, Amharic, Oromia, Tigrinya options

## 🚀 Deploy to Vercel (3 steps)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "GridGuard v1.0"
git remote add origin https://github.com/YOUR_USERNAME/gridguard.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Click **Deploy** — auto-detects Next.js

### Step 3: Add Environment Variables
In Vercel Dashboard → Settings → Environment Variables:

| Key | Value | Source |
|-----|-------|--------|
| `RESEND_API_KEY` | `re_xxxxxxxx` | [resend.com](https://resend.com) — Free 3,000 emails/month |
| `FROM_EMAIL` | `GridGuard <alerts@yourdomain.com>` | Your verified domain |
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxx` | [twilio.com](https://twilio.com) |
| `TWILIO_AUTH_TOKEN` | `xxxxxxxx` | Twilio console |
| `TWILIO_PHONE_NUMBER` | `+1xxxxxxxxxx` | Twilio phone number |

> **Note**: All APIs work in "demo mode" without keys — they log to console instead of sending. Add keys for real notifications.

## 🛠 Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## 📁 Project Structure

```
gridguard/
├── public/
│   └── app.html          # Main GridGuard SPA (Leaflet map + full UI)
├── pages/
│   ├── index.js          # Redirects to app.html
│   └── api/
│       ├── send-sms.js   # Twilio SMS endpoint
│       └── send-email.js # Resend email endpoint
├── package.json
└── README.md
```

## 🔑 API Endpoints

### POST /api/send-sms
```json
{ "to": "+251911234567", "message": "GridGuard: Outage in Bole resolved." }
```

### POST /api/send-email
```json
{
  "to": "user@email.com",
  "name": "Dawit Bekele",
  "area": "Bole, Addis Ababa",
  "outageType": "Unplanned Outage",
  "refId": "EEU-247891"
}
```

## 🎨 Design System

Following GridGuard brand guidelines:
- **Primary**: `#4567b7` (deep blue — trust & reliability)
- **Accent**: `#34c759` (green — success & restoration)  
- **Background**: `#f2f2f2` (light gray — neutral canvas)
- **Typography**: Montserrat (headings) + Lato (body)

## 👥 User Roles

| Role | Access |
|------|--------|
| **Citizens** | View map, report outages, subscribe to email/SMS alerts, see nearby outages |
| **EEU Staff** | Full portal — schedule maintenance, verify reports, dispatch crews, analytics |

## Demo Credentials
Staff Portal: any Staff ID + any Password (demo mode)

---
*GridGuard — "Stay ahead of the curve." · Designed for Ethiopian Electric Utility (EEU)*
