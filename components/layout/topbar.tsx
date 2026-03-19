import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Bell } from "lucide-react";

export async function Topbar() {
  const { orgSlug } = await auth();   // ← add await

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
      <span className="text-sm text-muted-foreground">{orgSlug ?? "Your workspace"}</span>
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors" aria-label="Notifications">
          <Bell className="w-4 h-4" />
        </button>
        <UserButton afterSignOutUrl="/sign-in" appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
      </div>
    </header>
  );
}