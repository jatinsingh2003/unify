# Phase 4 Context: Product Usability & Intelligence

## Overview
Phase 4 focuses on making Unify feel "complete" and "reliable" by adding lightweight intelligence, better feedback loops, and actionable insights. We are avoiding complex attribution engines and AI, focusing instead on rule-based clarity and UX polish.

## Implementation Decisions

### 1. Attribution (Order-Level)
- **D-01: Table Structure**: Create a new `order_attribution` table. Do **NOT** modify the existing `daily_metrics` table to avoid data corruption and maintain historical purity.
- **D-02: Data Granularity**: Store UTM parameters (`source`, `medium`, `campaign`, `content`, `term`) at the individual order level to enable future deep-drill analytics.

### 2. Notifications (Persistent)
- **D-03: Storage**: Create a dedicated `notifications` table in Supabase.
- **D-04: State Management**: Persist the `read`/`unread` state across all user sessions and devices to ensure a consistent cross-platform experience.

### 3. Intelligence (Relative & Reactive)
- **D-05: Range Sensitivity**: All performance insights must dynamically recalculate based on the **Current Date Range** selected in the dashboard UI.
- **D-06: Comparison Logic**: Insights should compare performance against the **Previous Equivalent Period** (e.g., if "Last 7 Days" is selected, compare with the 7 days prior).

### 4. Visibility (Omnipresent Sync)
- **D-07: Global Status**: Implement a "Last Synced" global indicator in the `Topbar`.
- **D-08: Granular Status**: Show individual platform-level sync timestamps within the `Integrations` page cards.

## Scope Guards
- **NO** Slack/Email delivery yet.
- **NO** Multi-currency conversion.
- **NO** ML/AI-driven insights.
- **NO** Custom metric builder.
