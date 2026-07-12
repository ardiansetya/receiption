"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import type { Category, Transaction } from "@/db/schema";
import { CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

export type TransactionDraft = {
  id?: string;
  type: "income" | "expense";
  category: Category;
  amount: number;
  title: string;
  note?: string | null;
  date: string;
  source?: "manual" | "ocr";
  receiptUrl?: string | null;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyDraft = (): TransactionDraft => ({
  type: "expense",
  category: "makanan",
  amount: 0,
  title: "",
  note: "",
  date: today(),
  source: "manual",
});

export function TransactionFormDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Isi untuk mode edit (dengan id) atau prefill hasil OCR (tanpa id). */
  initial?: TransactionDraft | null;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<TransactionDraft>(emptyDraft());
  const isEdit = Boolean(draft.id);

  useEffect(() => {
    if (open) setDraft(initial ? { ...initial } : emptyDraft());
  }, [open, initial]);

  const mutation = useMutation({
    mutationFn: async (data: TransactionDraft) => {
      const res = await fetch(
        data.id ? `/api/transactions/${data.id}` : "/api/transactions",
        {
          method: data.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: data.type,
            category: data.category,
            amount: data.amount,
            title: data.title,
            note: data.note || null,
            date: data.date,
            source: data.source ?? "manual",
            receiptUrl: data.receiptUrl ?? null,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan transaksi");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success(isEdit ? "Transaksi diperbarui." : "Transaksi tercatat.");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.amount <= 0) {
      toast.error("Nominal harus lebih dari 0.");
      return;
    }
    mutation.mutate(draft);
  };

  const categoryItems: Category[] =
    draft.type === "income"
      ? ["pemasukan", "lainnya"]
      : EXPENSE_CATEGORIES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Transaksi" : "Catat Transaksi"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    type: t,
                    category: t === "income" ? "pemasukan" : "makanan",
                  }))
                }
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  draft.type === t
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {t === "expense" ? "Pengeluaran" : "Pemasukan"}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tx-title">Judul</Label>
            <Input
              id="tx-title"
              required
              maxLength={120}
              placeholder={
                draft.type === "expense" ? "Makan siang warteg" : "Uang saku"
              }
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tx-amount">Nominal (Rp)</Label>
              <Input
                id="tx-amount"
                type="number"
                required
                min={1}
                step={1}
                inputMode="numeric"
                value={draft.amount || ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, amount: Number(e.target.value) }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tx-date">Tanggal</Label>
              <Input
                id="tx-date"
                type="date"
                required
                value={draft.date}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, date: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Kategori</Label>
            <Select
              items={categoryItems.map((c) => ({
                value: c,
                label: CATEGORY_LABELS[c],
              }))}
              value={draft.category}
              onValueChange={(v) =>
                v && setDraft((d) => ({ ...d, category: v as Category }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categoryItems.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tx-note">Catatan (opsional)</Label>
            <Textarea
              id="tx-note"
              rows={2}
              maxLength={500}
              value={draft.note ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, note: e.target.value }))
              }
            />
          </div>

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Menyimpan..."
              : isEdit
                ? "Simpan Perubahan"
                : "Simpan Transaksi"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type { Transaction };
