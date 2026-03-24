/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-require-imports */
"use client";
export const dynamic = "force-dynamic";

import { CreateOrganization } from "@clerk/nextjs";
// import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  // const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">U</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-white">Unify</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Create your workspace</h1>
          <p className="text-sm text-slate-400 mt-1">
            Each workspace is isolated — perfect for an agency or brand.
          </p>
        </div>

        <CreateOrganization
          afterCreateOrganizationUrl="/overview"
          skipInvitationScreen
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-md border border-border rounded-xl",
            },
          }}
        />
      </div>
    </div>
  );
}
