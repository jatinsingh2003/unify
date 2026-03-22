// components/reports/report-export-button.tsx
"use client";

import { useState } from "react";
import { Download, ChevronDown, FileText, Code } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Props {
  from: string;
  to: string;
  platform: string;
}

export function ReportExportButton({ from, to, platform }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport(format: "csv" | "json") {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to, platform, format });
      const res = await fetch(`/api/reports/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `unify-report-${from}-to-${to}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to export report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" className="bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 rounded-2xl h-10 px-5 text-[10px] font-black uppercase tracking-[0.2em] gap-2.5 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all border-none italic">
          <Download className="w-4 h-4" />
          {loading ? "Exporting..." : "Handshake"}
          <ChevronDown className="w-3.5 h-3.5 opacity-50 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-2xl bg-card border border-white/5 backdrop-blur-xl group">
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.1em] px-4 py-3 rounded-xl cursor-pointer hover:bg-white/5 text-slate-400 hover:text-white transition-all italic"
        >
          <FileText className="w-4 h-4 text-indigo-500" />
          Download CSV
        </DropdownMenuItem>
        <div className="h-px bg-white/5 my-1 mx-2" />
        <DropdownMenuItem
          onClick={() => handleExport("json")}
          className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.1em] px-4 py-3 rounded-xl cursor-pointer hover:bg-white/5 text-slate-400 hover:text-white transition-all italic"
        >
          <Code className="w-4 h-4 text-emerald-500" />
          Raw JSON data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
