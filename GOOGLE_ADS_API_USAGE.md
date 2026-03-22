# Google Ads API Usage Disclosure: Unify Performance Dashboard

## 1. Project Overview
**Unify** is a centralized analytics and reporting platform designed for marketing agencies to track their performance across multiple advertising channels (Google Ads, Meta Ads, and Shopify). The platform normalizes data from these disparate sources to provide a unified view of ROAS (Return on Ad Spend) and campaign efficiency.

## 2. Intended Use of Google Ads API
Unify uses the Google Ads API strictly for **Read-Only Reporting and Analytics**. The platform does not perform any management, editing, or bidding operations. The specific use cases include:
- **Account Retrieval**: Fetching the list of sub-accounts (customers) accessible via the authenticated user's credentials to allow them to select specific accounts for tracking.
- **Campaign Monitoring**: Retrieving campaign metadata (ID, Name, Status) to organize reporting data.
- **Performance Metrics**: Syncing daily metrics such as cost, impressions, clicks, conversions, and conversion value to calculate performance KPIs.

## 3. Specific API Methods and Resources
The application interacts with the following REST endpoints:
- `GET /v19/customers:listAccessibleCustomers`: To identify accessible accounts.
- `POST /v19/customers/{customer_id}/googleAds:search`: To execute GAQL queries for campaigns and performance metrics.

## 4. Data Security and Privacy
Unify is built with a "Security-First" architecture:
- **Authentication**: User authentication is handled via **Clerk**, ensuring enterprise-grade identity management.
- **OAuth State Protection**: Stateless CSRF protection (HMAC-SHA256) is used during the OAuth 2.0 flow.
- **Token Security**: OAuth 2.0 access and refresh tokens are stored in a secure **Supabase** database. Tokens are only used for background syncs authorized by the account owner.
- **Statelessness**: No sensitive data is stored on the client side; all data fetching is handled server-side to prevent credential exposure.

## 5. Compliance
Our use of the Google Ads API complies with the **Google Ads API Terms and Conditions**. We only request the `https://www.googleapis.com/auth/adwords` scope for read-only purposes and do not share data with any third parties other than the authorized user of the dashboard.

---
**Prepared for**: Google Ads API Developer Token / OAuth Verification
**Platform**: Unify SaaS Dashboard
**Technical Contact**: Agency Admin
