/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com https://*.clerk.accounts.dev https://clerk.spritzstudio.in https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
              "font-src 'self' https://fonts.gstatic.com https://api.fontshare.com https://cdn.fontshare.com",
              "img-src 'self' data: https://img.clerk.com https://*.clerk.com",
              "connect-src 'self' https://*.supabase.co https://clerk.com https://*.clerk.accounts.dev https://clerk.spritzstudio.in https://api.inngest.com wss://*.clerk.accounts.dev wss://clerk.spritzstudio.in",
              "worker-src blob:",
              // ↓ THIS was the problem — Clerk renders CreateOrganization in an iframe
              "frame-src https://challenges.cloudflare.com https://clerk.spritzstudio.in https://*.clerk.accounts.dev",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;