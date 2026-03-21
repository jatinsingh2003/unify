// components/campaigns/campaigns-table.tsx
// Full campaigns table with pagination, platform filter, and sortable columns.

"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PLATFORM_COLORS: Record<string, string> = {
  google: "bg-blue-100 text-blue-800",
  meta: "bg-indigo-100 text-indigo-800",
  shopify: "bg-green-100 text-green-800",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  archived: "bg-gray-100 text-gray-600",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

interface Props {
  days?: number;
}

export function CampaignsTable({ days = 30 }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState("all");
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/metrics/campaigns?days=${days}&platform=${platform}&page=${page}&limit=${limit}`
    )
      .then((r) => r.json())
      .then((json) => {
        setData(json.campaigns ?? []);
        setTotal(json.total ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days, platform, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} campaign{total !== 1 ? "s" : ""}
        </p>
        <Select value={platform} onValueChange={(v) => { setPlatform(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="google">Google</SelectItem>
            <SelectItem value="meta">Meta</SelectItem>
            <SelectItem value="shopify">Shopify</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">CTR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No campaigns found. Connect a platform and run a sync.
                </TableCell>
              </TableRow>
            ) : (
              data.map((campaign) => (
                <TableRow key={`${campaign.platform}-${campaign.external_campaign_id}`}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {campaign.name}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        PLATFORM_COLORS[campaign.platform] ?? ""
                      }`}
                    >
                      {campaign.platform}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[campaign.status] ?? ""
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(campaign.spend)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(campaign.revenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {campaign.clicks.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {campaign.ctr > 0 ? `${campaign.ctr.toFixed(2)}%` : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
