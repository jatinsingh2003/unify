import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { OrganizationProfile } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your workspace, members, and preferences
        </p>
      </div>

      <OrganizationProfile
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-none border border-border rounded-xl w-full",
          },
        }}
      />
    </div>
  );
}
