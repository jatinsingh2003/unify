// app/(dashboard)/integrations/page.tsx
import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);
const MetaLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const ShopifyLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#96BF48">
    <path d="M15.337 23.979l7.216-1.561s-2.597-17.566-2.617-17.693c-.019-.129-.129-.214-.239-.214-.111 0-2.066-.037-2.066-.037s-1.372-1.336-1.52-1.484v21.989zM13.99 4.205s-.93-.277-2.036-.277c-2.098 0-3.103 1.336-3.103 2.599 0 1.429 1.024 2.135 1.994 2.765 1.004.647 1.318 1.079 1.318 1.731 0 .872-.703 1.356-1.374 1.356-.943 0-1.98-.611-1.98-.611l-.352 2.153s.906.634 2.407.634c2.228 0 3.436-1.355 3.436-2.895 0-1.3-.762-2.154-1.883-2.894-.891-.591-1.225-1.041-1.225-1.62 0-.648.574-1.115 1.429-1.115.887 0 1.744.279 1.744.279l.625-3.105z"/>
  </svg>
);

const SUCCESS_LABELS: Record<string, string> = {
  google:  "Google Ads connected successfully!",
  meta:    "Meta Ads connected successfully!",
  shopify: "Shopify connected successfully!",
};

const ERROR_LABELS: Record<string, string> = {
  missing_params:        "OAuth was cancelled or missing parameters.",
  invalid_state:         "Session expired — please try connecting again. (Server may have restarted.)",
  token_exchange_failed: "Google rejected the auth code. Check your GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env.",
  save_failed:           "Token was received but failed to save to database. Check Supabase logs.",
};

interface Props {
  searchParams: { success?: string; error?: string; detail?: string };
}

export default async function IntegrationsPage({ searchParams }: Props) {
  const { orgId } = await auth();
  if (!orgId) return null;

  const supabase = createServiceClient();
  const { data: integrations, error: dbError } = await supabase
    .from("integrations")
    .select("platform, active, last_synced_at")
    .eq("client_id", orgId);

  const get = (p: string) => integrations?.find(i => i.platform === p);

  const successPlatform = searchParams.success;
  const errorCode       = searchParams.error;
  const errorDetail     = searchParams.detail;
  return (
    <div className="min-h-screen bg-background container-padding">
      <div className="max-w-7xl mx-auto section-spacing">
        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-heading-lg">Channels</h1>
          <p className="text-body-sm mt-2 max-w-lg">
            Connect your advertising and commerce platforms to unify your marketing performance data in one professional dashboard.
          </p>
        </div>

      {/* Success banner */}
      {successPlatform && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 px-6 py-4 text-emerald-400 animate-in zoom-in-95 duration-500">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="text-ui-label text-emerald-500">{SUCCESS_LABELS[successPlatform] ?? `${successPlatform} connected!`}</p>
        </div>
      )}

      {/* Error banner */}
      {errorCode && (
        <div className="flex items-start gap-4 rounded-2xl border border-rose-500/10 bg-rose-500/5 px-6 py-5 text-rose-400 animate-in zoom-in-95 duration-500">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-ui-label text-rose-500">Sync Failure: {errorCode}</p>
            <p className="text-body-sm text-rose-400/80">
              {ERROR_LABELS[errorCode] ?? "An unexpected error occurred during the integration handshake."}
            </p>
            {errorDetail && (
              <p className="mt-2 font-mono text-[10px] bg-black/20 p-2 rounded-lg border border-white/5 text-rose-500/70 max-w-fit">Detail: {errorDetail}</p>
            )}
          </div>
        </div>
      )}

      {/* DB error */}
      {dbError && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/10 bg-amber-500/5 px-6 py-4 text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-ui-label text-amber-500 underline decoration-amber-500/20">Database Error: {dbError.message}</p>
        </div>
      )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          <IntegrationCard platform="google" name="Google Ads" description="Sync search and display campaigns, spend, and conversion data."
            connected={!!get("google")?.active} lastSyncedAt={get("google")?.last_synced_at}
            connectHref="/api/integrations/google/connect" logo={<GoogleLogo />} />
          <IntegrationCard platform="meta" name="Meta Ads" description="Sync Facebook & Instagram performance with deep attribution."
            connected={!!get("meta")?.active} lastSyncedAt={get("meta")?.last_synced_at}
            connectHref="/api/integrations/meta/connect" logo={<MetaLogo />} />
          <IntegrationCard platform="shopify" name="Shopify" description="Pull order data to calculate true Net Sales and ROAS."
            connected={!!get("shopify")?.active} lastSyncedAt={get("shopify")?.last_synced_at}
            connectHref="#" logo={<ShopifyLogo />} />
        </div>
      </div>
    </div>
  );
}
