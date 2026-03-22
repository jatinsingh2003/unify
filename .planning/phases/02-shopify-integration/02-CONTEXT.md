# Phase 2: Shopify Integration & Metrics Pipeline - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary
This phase delivers a full Shopify integration, allowing users to connect their Shopify stores, sync order revenue data, and view normalized ecommerce metrics alongside their ad platform data.

**Key Deliverables:**
- Shopify OAuth flow with secure token storage.
- Background sync job (Inngest) for periodic data fetching.
- Data normalization mapping Shopify orders to a "Synthetic Campaign" in the unified schema.
- UI components for shop selection and integration status.
</domain>

<decisions>
## Implementation Decisions

### Shop Domain Collection (UI/UX)
- **D-01:** Use a **Modal Dialog** for collecting the shop domain.
- **D-02:** The modal should have a single input field for the `.myshopify.com` domain.
- **D-03:** Trigger the modal when the user clicks "Connect" on the Shopify integration card.

### Historical Sync Depth (Performance)
- **D-04:** Perform an initial sync of the last **90 days** of data upon first connection.
- **D-05:** Subsequent syncs (nightly or manual) will focus on more recent data (e.g., last 1-7 days).

### Revenue Metric Definition (Data)
- **D-06:** Use **Net Sales** as the standard "Revenue" metric.
- **D-07:** Formula: `Revenue = Subtotal - Discounts - Returns`. Shipping and taxes are excluded from the core ROAS calculation.

### Attribution Strategy (Unified Reporting)
- **D-08:** Use a **Synthetic Campaign** approach for Shopify data.
- **D-09:** Treat the entire Shopify store as one unified source ("Shopify Orders") rather than attempting to parse UTMs for attribution in this phase.
- **D-10:** Map all Shopify daily metrics to this single synthetic campaign row.

### the agent's Discretion
- The agent has discretion over the specific modal styling (using shadcn/ui) and the exact structure of the error handling during the OAuth flow.
</decisions>

<canonical_refs>
## Canonical References
- `lib/platforms/shopify.ts` — Core Shopify API logic.
- `lib/normalizer.ts` — Shopify order normalization logic.
- `lib/inngest/functions.ts` — Sync job implementation.
- `app/(dashboard)/integrations/page.tsx` — UI for connecting Shopify.
</canonical_refs>
