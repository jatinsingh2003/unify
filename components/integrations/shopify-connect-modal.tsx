// components/integrations/shopify-connect-modal.tsx
"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2Icon } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopifyConnectModal({ open, onOpenChange }: Props) {
  const [shop, setShop] = useState("");
  const [loading, setLoading] = useState(false);

  function handleConnect() {
    if (!shop) return;
    setLoading(true);
    // Standard Shopify shops end in .myshopify.com
    // We append it if the user just typed the name
    let domain = shop.trim();
    if (!domain.includes(".")) {
      domain = `${domain}.myshopify.com`;
    }
    
    // Redirect to the connect API route
    window.location.href = `/api/integrations/shopify/connect?shop=${encodeURIComponent(domain)}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Shopify</DialogTitle>
          <DialogDescription>
            Enter your Shopify store URL (e.g., my-store.myshopify.com) to start the connection process.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            placeholder="my-store.myshopify.com"
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            disabled={loading}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={!shop || loading}>
            {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Connect Store
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
