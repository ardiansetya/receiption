"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/app/category-icon";
import type { Category } from "@/db/schema";
import { CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/categories";
import { formatIDR } from "@/lib/format";

export type ReviewItem = {
  name: string;
  quantity: number;
  amount: number;
  category: Category;
};

export type ReceiptReviewData = {
  storeName: string;
  date: string;
  total: number;
  items: ReviewItem[];
};

const categorySelectItems = EXPENSE_CATEGORIES.map((c) => ({
  value: c,
  label: CATEGORY_LABELS[c],
}));

export function ReceiptReviewDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReceiptReviewData | null;
}) {
  const queryClient = useQueryClient();
  const [storeName, setStoreName] = useState("");
  const [date, setDate] = useState("");
  const [items, setItems] = useState<ReviewItem[]>([]);

  useEffect(() => {
    if (open && data) {
      setStoreName(data.storeName);
      setDate(data.date);
      setItems(data.items.map((i) => ({ ...i })));
    }
  }, [open, data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, date, items }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "Gagal menyimpan transaksi");
      }
      return body as { transactions: { id: string }[] };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success(
        result.transactions.length > 1
          ? `Tersimpan sebagai ${result.transactions.length} transaksi per kategori.`
          : "Transaksi tercatat."
      );
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateItem = (index: number, patch: Partial<ReviewItem>) => {
    setItems((list) =>
      list.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems((list) => list.filter((_, i) => i !== index));
  };

  /* Ringkasan per kategori */
  const groups = new Map<Category, number>();
  for (const item of items) {
    groups.set(item.category, (groups.get(item.category) ?? 0) + item.amount);
  }
  const sum = items.reduce((s, i) => s + i.amount, 0);
  const totalMismatch =
    data && data.total > 0 && Math.abs(sum - data.total) / data.total > 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Minimal satu item.");
      return;
    }
    if (items.some((i) => i.amount <= 0 || !i.name.trim())) {
      toast.error("Semua item butuh nama dan nominal lebih dari 0.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Periksa Hasil Scan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rr-store">Nama toko</Label>
              <Input
                id="rr-store"
                required
                maxLength={120}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rr-date">Tanggal</Label>
              <Input
                id="rr-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Item ({items.length})</Label>
            <div className="flex flex-col gap-2">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-3"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={item.name}
                      maxLength={120}
                      aria-label={`Nama item ${i + 1}`}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Hapus item ${i + 1}`}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      aria-label={`Nominal item ${i + 1}`}
                      value={item.amount || ""}
                      onChange={(e) =>
                        updateItem(i, { amount: Number(e.target.value) })
                      }
                      className="w-32"
                    />
                    <Select
                      items={categorySelectItems}
                      value={item.category}
                      onValueChange={(v) =>
                        v && updateItem(i, { category: v as Category })
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorySelectItems.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {groups.size > 0 && (
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Akan disimpan sebagai {groups.size} transaksi
              </p>
              <ul className="flex flex-col gap-1.5">
                {[...groups.entries()].map(([cat, total]) => (
                  <li
                    key={cat}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <CategoryIcon category={cat} size={14} />
                    </span>
                    <span className="flex-1">{CATEGORY_LABELS[cat]}</span>
                    <span className="font-mono font-medium">
                      {formatIDR(total)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t border-border/60 pt-2 text-sm">
                <span className="text-muted-foreground">Jumlah item</span>
                <span className="font-mono font-semibold">{formatIDR(sum)}</span>
              </div>
              {totalMismatch && data && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Total di nota terbaca {formatIDR(data.total)}. Periksa nominal
                  item bila berbeda.
                </p>
              )}
            </div>
          )}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Menyimpan..."
              : groups.size > 1
                ? `Simpan ${groups.size} Transaksi`
                : "Simpan Transaksi"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
