import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Toaster } from "sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/onboarding");

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground selection:bg-indigo-500/30">
      {/* Animated background subtle glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto animate-fade-in transition-all duration-500">{children}</div>
        </main>
      </div>
      <Toaster position="top-right" richColors theme="dark" closeButton />
    </div>
  );
}