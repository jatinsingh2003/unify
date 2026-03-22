# Phase 3 Context: Reporting & UI Polish

## Overview
Phase 3 focuses on expanding the data visualization and export capabilities of Unify, and providing a "premium" feel through UI refinements.

## Current State
- **Reports**: A basic CSV export API exists but is limited to a fixed set of columns.
- **Campaign Details**: A daily breakdown page exists with a single chart.
- **UI**: Core layout is solid, but missing interactive feedback (alerts) and deep comparison tools.

## Key Decisions Needed

### 1. Reporting Depth
- **Additional Formats**: Should we support PDF or JSON exports?
- **Granularity**: Should reports show daily breakdowns per campaign, or just the period totals?
- **Metric Inclusion**: Do we need to include Shopify-specific metrics (e.g. Average Order Value, Discount Rate) in the exports?

### 2. Campaign Detail Enhancements
- **Comparison Logic**: Should we show comparison data (e.g. "vs Previous Period") on the campaign detail page, similar to the main dashboard?
- **Chart Interactions**: Should we add more chart types (e.g. Conversion Rate over time) to the detail view?

### 3. UI Polish
- **Alert System**: Implementation of a global toast/alert system for sync status and errors.
- **Interactive Tooltips**: Enhancement of Recharts tooltips to show clearer data points and period comparisons.
