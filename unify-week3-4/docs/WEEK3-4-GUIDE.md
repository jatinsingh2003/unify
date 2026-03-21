# Week 3 & 4 — File Placement Guide

## Where to put each file

```
YOUR PROJECT ROOT (G:\Jatin\Unify)
│
├── lib/
│   ├── normalizer.ts                        ← REPLACE existing file
│   ├── inngest/
│   │   ├── client.ts                        ← REPLACE existing file
│   │   └── functions.ts                     ← REPLACE existing file
│   └── platforms/
│       ├── google-ads.ts                    ← REPLACE existing file
│       ├── meta-ads.ts                      ← REPLACE existing file
│       └── shopify.ts                       ← NEW FILE (Week 4)
│
├── app/
│   └── api/
│       ├── inngest/
│       │   └── route.ts                     ← REPLACE existing file
│       ├── sync/
│       │   └── trigger/
│       │       └── route.ts                 ← REPLACE existing file
│       ├── metrics/
│       │   ├── overview/
│       │   │   └── route.ts                 ← REPLACE existing file
│       │   ├── timeseries/
│       │   │   └── route.ts                 ← REPLACE existing file
│       │   └── campaigns/
│       │       └── route.ts                 ← REPLACE existing file
│       └── integrations/
│           └── shopify/
│               ├── connect/
│               │   └── route.ts             ← NEW FILE (Week 4)
│               └── callback/
│                   └── route.ts             ← NEW FILE (Week 4)
│
└── components/
    ├── dashboard/
    │   ├── kpi-card.tsx                     ← REPLACE existing file
    │   ├── kpi-grid.tsx                     ← REPLACE existing file
    │   ├── performance-chart.tsx            ← REPLACE existing file
    │   └── channel-breakdown.tsx            ← REPLACE existing file
    ├── campaigns/
    │   └── campaigns-table.tsx              ← REPLACE existing file
    └── integrations/
        └── integration-card.tsx             ← REPLACE existing file
```

---

## What each file does

| File | Purpose |
|------|---------|
| `lib/normalizer.ts` | Converts raw Google/Meta/Shopify API responses into unified DB rows |
| `lib/inngest/client.ts` | Singleton Inngest client used everywhere |
| `lib/inngest/functions.ts` | Two jobs: `syncPlatform` (on demand) + `nightlySync` (2 AM cron) |
| `lib/platforms/google-ads.ts` | Google Ads API: token refresh, fetch campaigns + metrics |
| `lib/platforms/meta-ads.ts` | Meta Graph API: token refresh, fetch campaigns + insights |
| `lib/platforms/shopify.ts` | Shopify Admin API: OAuth exchange, fetch orders |
| `app/api/inngest/route.ts` | Inngest webhook — registers all functions with Inngest cloud |
| `app/api/sync/trigger/route.ts` | Manual sync button endpoint (rate limited 1/10min per platform) |
| `app/api/metrics/overview/route.ts` | KPI totals (spend, revenue, ROAS, etc.) with % change vs prev period |
| `app/api/metrics/timeseries/route.ts` | Daily spend/revenue series for the area chart |
| `app/api/metrics/campaigns/route.ts` | Campaign-level metrics table with pagination |
| `app/api/integrations/shopify/connect/route.ts` | Start Shopify OAuth flow |
| `app/api/integrations/shopify/callback/route.ts` | Complete Shopify OAuth, save encrypted token |
| `components/dashboard/kpi-card.tsx` | Single metric card with trend arrow |
| `components/dashboard/kpi-grid.tsx` | Row of 6 KPI cards, fetches /api/metrics/overview |
| `components/dashboard/performance-chart.tsx` | Spend vs Revenue area chart |
| `components/dashboard/channel-breakdown.tsx` | Platform spend donut chart |
| `components/campaigns/campaigns-table.tsx` | Full campaigns table with filters + pagination |
| `components/integrations/integration-card.tsx` | Connect/Sync card per platform |

---

## New env vars to add to .env.local (Week 4 — Shopify)

```env
SHOPIFY_CLIENT_ID=your_shopify_app_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_app_client_secret
```

Add Shopify redirect URI in your Shopify Partner dashboard:
`http://localhost:3000/api/integrations/shopify/callback`

---

## How to test Week 3 (Inngest sync)

1. Make sure your `.env.local` has `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`
2. In Terminal 1: `npm run dev`
3. In Terminal 2: `npx inngest-cli@latest dev`  (or `npm run inngest` if you have that script)
4. Open http://localhost:8288 — this is the Inngest dev UI
5. Go to your app's Integrations page → click "Sync Now" on a connected platform
6. Watch the job run in the Inngest dev UI

---

## How to add Shopify to the Integrations page UI

In your `app/(dashboard)/integrations/page.tsx`, add:

```tsx
<IntegrationCard
  platform="shopify"
  connected={/* check if shopify row exists in integrations table */}
  lastSyncedAt={/* from DB */}
  connectHref="/api/integrations/shopify/connect?shop=YOUR_STORE.myshopify.com"
/>
```

---

## Supabase: add `active` column to integrations table

Run this in Supabase SQL editor if the column doesn't exist:

```sql
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
```

Also update the nightly sync to set `last_synced_at` after each successful sync if you want to show it in the UI.
