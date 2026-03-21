# Where to Put Each File — Week 3 & 4

## 📁 File Placement Guide

### lib/ (core logic)

| File | Destination in your project | What it does |
|------|-----------------------------|--------------|
| `lib/normalizer.ts` | **REPLACE** existing `lib/normalizer.ts` | Converts raw Google/Meta/Shopify API responses into unified DB rows |
| `lib/platforms/google-ads.ts` | **REPLACE** existing file | Google Ads API client + auto token refresh |
| `lib/platforms/meta-ads.ts` | **REPLACE** existing file | Meta Graph API client + auto token refresh |
| `lib/platforms/shopify.ts` | **NEW FILE** → `lib/platforms/shopify.ts` | Shopify Admin API client + OAuth helpers |
| `lib/inngest/client.ts` | **REPLACE** existing file | Inngest singleton (unchanged, verify it matches) |
| `lib/inngest/functions.ts` | **REPLACE** existing file | syncPlatform + nightlySync Inngest jobs (now fully implemented) |

---

### app/api/ (API routes)

| File | Destination | What it does |
|------|-------------|--------------|
| `app/api/inngest/route.ts` | **REPLACE** existing | Registers all Inngest functions |
| `app/api/sync/trigger/route.ts` | **REPLACE** existing | Manual "Sync Now" endpoint with Redis rate limiting |
| `app/api/metrics/overview/route.ts` | **REPLACE** existing | KPI totals + % change vs previous period |
| `app/api/metrics/timeseries/route.ts` | **REPLACE** existing | Daily spend/revenue series for chart |
| `app/api/metrics/campaigns/route.ts` | **REPLACE** existing | Campaign table data with aggregated metrics |
| `app/api/integrations/google/connect/route.ts` | **REPLACE** existing | Starts Google OAuth flow |
| `app/api/integrations/google/callback/route.ts` | **REPLACE** existing | Handles Google OAuth callback, saves tokens |
| `app/api/integrations/meta/connect/route.ts` | **REPLACE** existing | Starts Meta OAuth flow |
| `app/api/integrations/meta/callback/route.ts` | **REPLACE** existing | Handles Meta OAuth callback, saves long-lived token |
| `app/api/integrations/shopify/connect/route.ts` | **NEW FILE** | Starts Shopify OAuth flow |
| `app/api/integrations/shopify/callback/route.ts` | **NEW FILE** | Handles Shopify OAuth callback, saves token |

---

### app/(dashboard)/ (pages)

| File | Destination | What it does |
|------|-------------|--------------|
| `app/(dashboard)/overview/page.tsx` | **REPLACE** existing | Overview page now uses real KpiGrid + PerformanceChart |
| `app/(dashboard)/integrations/page.tsx` | **REPLACE** existing | Integrations page reads live connection status from DB |

---

### components/ (UI components)

| File | Destination | What it does |
|------|-------------|--------------|
| `components/dashboard/kpi-card.tsx` | **REPLACE** existing | Individual KPI card with trend arrow |
| `components/dashboard/kpi-grid.tsx` | **REPLACE** existing | Fetches /api/metrics/overview and renders 6 cards |
| `components/dashboard/performance-chart.tsx` | **REPLACE** existing | Fetches /api/metrics/timeseries and renders area chart |
| `components/integrations/integration-card.tsx` | **REPLACE** existing | Connection card with live Sync Now button |

---

### docs/ (run this in Supabase)

| File | What to do |
|------|------------|
| `docs/week3-4-migration.sql` | Open **Supabase Dashboard → SQL Editor**, paste and run this |

---

## 🆕 New .env variables needed (add to .env.local)

```env
# Shopify (Week 4)
SHOPIFY_CLIENT_ID=your_shopify_app_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_app_client_secret
```

To get these: go to **partners.shopify.com → Apps → Create App → Client credentials**

---

## ✅ After dropping in the files

1. Run the SQL migration in Supabase
2. Add Shopify env vars to `.env.local`
3. Add `/api/integrations/shopify/callback` as a redirect URI in your Shopify Partner app
4. Restart dev server: `npm run dev`
5. In a second terminal: `npm run inngest` (Inngest dev server)
6. Go to `/integrations` and click Connect on any platform
7. After connecting, hit "Sync Now" — check the Inngest dev UI at `http://localhost:8288`
