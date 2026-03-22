import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in zoom-in-95 duration-700">
      <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-satoshi)' }}>{title}</h3>
      <p className="text-body-sm max-w-[280px] mb-8">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Button asChild className="rounded-xl px-8 bg-indigo-500 hover:bg-indigo-600 text-white border-none shadow-lg shadow-indigo-500/20">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
