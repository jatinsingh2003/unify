# Unify — Unified Marketing Analytics Dashboard

## Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Auth**: Clerk (multi-tenant Orgs)
- **Database**: Supabase Postgres (RLS enforced)
- **Background Jobs**: Inngest
- **Cache / Rate Limiting**: Upstash Redis (Vercel KV compatible)
- **Deployment**: Vercel

---

## 1. First-time setup

### Install dependencies
```bash
cd unify
npm install
```

### Copy env file
```bash
cp .env.local.example .env.local
```
Then fill in every `REPLACE_ME` value (see section 4 below).

### Generate encryption key
```bash
openssl rand -hex 32
# Paste output into ENCRYPTION_KEY in .env.local
```

### Run locally
```bash
# Terminal 1 — Next.js dev server
npm run dev

# Terminal 2 — Inngest dev server (background jobs)
npm run inngest
```

---

## 2. Clerk setup (required before first login)

### A. Create JWT Template for Supabase
1. Go to **Clerk Dashboard → JWT Templates → New Template**
2. Name it exactly: `supabase`
3. Set the template to:
```json
{
  "sub": "{{user.id}}",
  "org_id": "{{org.id}}",
  "role": "{{org.role}}"
}
```
4. Save.

This injects `org_id` into the JWT that Supabase RLS reads for tenant isolation.

### B. Configure Webhooks
1. Go to **Clerk Dashboard → Webhooks → Add Endpoint**
2. URL: `https://yourdomain.com/api/auth/webhook`
3. Events to subscribe: `organization.created`, `organization.deleted`
4. Copy the **Signing Secret** → paste into `CLERK_WEBHOOK_SECRET` in `.env.local`

### C. Enable Organizations
1. Go to **Clerk Dashboard → Organizations** → Enable
2. Set "Require organization membership" if you want to enforce org selection

---

## 3. Platform setup

### Google Ads
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Ads API**
3. Create **OAuth 2.0 Client ID** (Web application)
4. Add authorized redirect URI: `http://localhost:3000/api/integrations/google/callback`
   - Also add your production URL when deploying
5. Copy Client ID + Secret → `.env.local`
6. Apply for a **Google Ads Developer Token** at [ads.google.com/aw/apicenter](https://ads.google.com/aw/apicenter)

### Meta Ads
1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create a new App → Business type
3. Add **Marketing API** product
4. Settings → Basic → copy App ID + App Secret → `.env.local`
5. Add OAuth redirect: `http://localhost:3000/api/integrations/meta/callback`
6. Request permissions: `ads_read`, `ads_management`, `business_management`, `read_insights`

---

## 4. Environment variables reference

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → Signing Secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Already set: `https://jbrlulcqqfjztzzdwoso.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Already set in `.env.local.example` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth Clients |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth Clients |
| `GOOGLE_DEVELOPER_TOKEN` | Google Ads → Tools → API Center |
| `META_APP_ID` | Meta for Developers → App Settings |
| `META_APP_SECRET` | Meta for Developers → App Settings |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `INNGEST_EVENT_KEY` | [Inngest Dashboard](https://app.inngest.com) → Event Keys |
| `INNGEST_SIGNING_KEY` | Inngest Dashboard → Signing Keys |
| `KV_REST_API_URL` | [Upstash Console](https://console.upstash.com) → Redis → REST API |
| `KV_REST_API_TOKEN` | Upstash Console → Redis → REST API Token |
| `CRON_SECRET` | Any random string — `openssl rand -hex 16` |

---

## 5. Database schema

All tables are in Supabase with RLS enabled. Schema was applied automatically.

```
clients          — one row per Clerk Organization
integrations     — OAuth tokens per client per platform (AES-256-GCM encrypted)
campaigns        — campaign metadata from all platforms
daily_metrics    — normalized daily metrics (spend, revenue, ROAS, etc.)
```

RLS policy on every table:
```sql
client_id = (auth.jwt() ->> 'org_id')
```

---

## 6. Folder structure

```
app/
├── (auth)/sign-in, sign-up       — Clerk auth pages
├── (dashboard)/                  — Protected app shell
│   ├── layout.tsx                — Sidebar + topbar
│   ├── overview/                 — KPI cards + charts
│   ├── campaigns/                — Campaigns table
│   ├── integrations/             — Connect platforms
│   ├── reports/                  — (stub, Week 6)
│   └── settings/                 — Org management
├── api/
│   ├── auth/webhook/             — Clerk webhook → provision client
│   ├── integrations/google/      — OAuth connect + callback
│   ├── integrations/meta/        — OAuth connect + callback
│   ├── metrics/overview/         — KPI aggregation
│   ├── metrics/timeseries/       — Chart data
│   ├── metrics/campaigns/        — Campaign table data
│   ├── inngest/                  — Inngest endpoint
│   └── sync/trigger/             — Manual sync (rate limited)
└── onboarding/                   — Create org wizard

lib/
├── supabase/client.ts            — Browser Supabase client
├── supabase/server.ts            — Server client (Clerk JWT) + service role
├── platforms/google-ads.ts       — Google Ads API + token refresh
├── platforms/meta-ads.ts         — Meta Graph API + token refresh
├── normalizer.ts                 — Cross-platform data normalization
├── encryption.ts                 — AES-256-GCM for OAuth tokens
├── kv.ts                         — Redis (CSRF state, rate limiting)
├── inngest/client.ts             — Inngest singleton
├── inngest/functions.ts          — syncPlatform + nightlySync jobs
└── utils.ts                      — cn(), formatCurrency(), etc.

components/
├── layout/sidebar.tsx            — Nav sidebar
├── layout/topbar.tsx             — Header with user button
├── dashboard/kpi-grid.tsx        — 6-metric KPI row
├── dashboard/kpi-card.tsx        — Individual metric card
├── dashboard/performance-chart.tsx — Spend vs revenue area chart
├── dashboard/channel-breakdown.tsx — Platform donut chart
├── integrations/integration-card.tsx — Connect/sync card
├── campaigns/campaigns-table.tsx — Full campaigns table
└── ui/date-range-picker.tsx      — 7d/30d/90d + custom range
```

---

## 7. Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set all env vars
vercel env add CLERK_SECRET_KEY
# ... repeat for each variable

# Production deploy
vercel --prod
```

Add production OAuth redirect URIs to Google and Meta dashboards.

---

## 8. Build order (Week plan)

| Week | Ship |
|------|------|
| ✅ 1 | Schema + RLS + Clerk + Next.js scaffold |
| ✅ 2 | Google + Meta OAuth + token storage |
| 🔲 3 | Inngest sync jobs + normalizer (test with real accounts) |
| 🔲 4 | Shopify token flow + full metrics pipeline |
| 🔲 5 | Overview polish + date comparison + alerts |
| 🔲 6 | Campaigns detail view + reports export |
