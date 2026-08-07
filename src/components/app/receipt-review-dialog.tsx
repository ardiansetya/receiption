"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Plus, Trash, UsersThree } from "@phosphor-icons/react";
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
import {
  AssigneeToggles,
  ParticipantEditor,
  type Person,
} from "@/components/app/split-assign";
import type { Category } from "@/db/schema";
import { CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/categories";
import { formatIDR } from "@/lib/format";
import { computeSplit, formatSplitText, ME } from "@/lib/split";
import { api, apiErrorMessage } from "@/lib/api";

export type ReviewItem = {
  name: string;
  quantity: number;
  amount: number;
  category: Category;
};

/* Item saat diedit: tambahan penanda pembagian untuk mode patungan */
type DraftItem = ReviewItem & { shared: boolean; assignees: string[] };

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

/* Pajak/servis biasanya biaya bersama, jadi dicentang otomatis */
const SHARED_HINT = /pajak|ppn|pb1|servis|service|layanan|ongkir|delivery/i;

const toDraft = (item: ReviewItem): DraftItem => ({
  ...item,
  shared: SHARED_HINT.test(item.name),
  assignees: [],
});

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
  const [items, setItems] = useState<DraftItem[]>([]);
  const [splitMode, setSplitMode] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    if (open && data) {
      setStoreName(data.storeName);
      setDate(data.date);
      setItems(data.items.map(toDraft));
      setSplitMode(false);
      setPeople([]);
    }
  }, [open, data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: result, error } = await api.transactions.batch.post({
        storeName,
        date,
        items: items.map(({ name, quantity, amount, category }) => ({
          name,
          quantity,
          amount,
          category,
        })),
      });
      if (error) {
        throw new Error(
          apiErrorMessage(error.value, "Gagal menyimpan transaksi")
        );
      }
      return result;
    },
    onSuccess: (result) => {
      invalidate();
      toast.success(
        result.transactions.length > 1
          ? `Tersimpan sebagai ${result.transactions.length} transaksi per kategori.`
          : "Transaksi tercatat."
      );
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const splitMutation = useMutation({
    mutationFn: async () => {
      const { data: result, error } = await api.splits.post({
        storeName,
        date,
        participants: people,
        items: items.map(
          ({ name, quantity, amount, category, shared, assignees }) => ({
            name,
            quantity,
            amount,
            category,
            shared,
            assignees,
          })
        ),
      });
      if (error) {
        throw new Error(apiErrorMessage(error.value, "Gagal menyimpan patungan"));
      }
      return result;
    },
    onSuccess: (result) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["splits"] });
      toast.success(
        `Patungan tersimpan. Bagianmu ${formatIDR(result.myAmount)} masuk pengeluaran.`
      );
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pending = saveMutation.isPending || splitMutation.isPending;

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((list) =>
      list.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems((list) => list.filter((_, i) => i !== index));
  };

  const sum = items.reduce((s, i) => s + i.amount, 0);
  const diff = data ? data.total - sum : 0;
  const totalMismatch =
    data && data.total > 0 && Math.abs(diff) / data.total > 0.01;

  const split = useMemo(
    () =>
      computeSplit(
        items,
        people.map((p) => p.id)
      ),
    [items, people]
  );

  /* Hanya porsi pengguna yang masuk ledger saat mode patungan aktif */
  const ledgerItems = splitMode
    ? (split.shares.find((s) => s.id === ME)?.items ?? [])
    : items.map(({ name, amount, category }) => ({ name, amount, category }));

  const groups = new Map<Category, number>();
  for (const item of ledgerItems) {
    groups.set(item.category, (groups.get(item.category) ?? 0) + item.amount);
  }
  const ledgerSum = ledgerItems.reduce((s, i) => s + i.amount, 0);

  /* Kategori dominan berdasar nilai, untuk item selisih (pajak/servis dsb.) */
  const dominantCategory: Category =
    [...groups.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "lainnya";

  const addDifferenceItem = () => {
    if (diff <= 0) return;
    setItems((list) => [
      ...list,
      toDraft({
        name: "Pajak & Layanan",
        quantity: 1,
        amount: diff,
        category: dominantCategory,
      }),
    ]);
  };

  const addItem = () => {
    setItems((list) => [
      ...list,
      {
        name: "",
        quantity: 1,
        amount: 0,
        category: dominantCategory,
        shared: false,
        assignees: [],
      },
    ]);
  };

  const copySplitText = async () => {
    const text = formatSplitText({
      title: storeName,
      date,
      totalAmount: split.total,
      myAmount: split.myAmount,
      participants: people.map((p) => {
        const share = split.shares.find((s) => s.id === p.id);
        return {
          name: p.name,
          amount: share?.amount ?? 0,
          items: share?.items ?? [],
        };
      }),
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Ringkasan disalin.");
    } catch {
      toast.error("Gagal menyalin. Salin manual dari halaman Patungan.");
    }
  };

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
    if (splitMode) {
      if (people.length === 0) {
        toast.error("Tambahkan minimal satu teman untuk patungan.");
        return;
      }
      splitMutation.mutate();
      return;
    }
    saveMutation.mutate();
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

          <div className="rounded-xl border border-border/60 p-3">
            <button
              type="button"
              onClick={() => setSplitMode((v) => !v)}
              aria-pressed={splitMode}
              className="flex w-full items-center gap-2 text-left"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UsersThree size={16} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium">
                  Bagi bareng teman
                </span>
                <span className="block text-xs text-muted-foreground">
                  Hanya bagianmu yang masuk pengeluaran
                </span>
              </span>
              <span
                className={
                  splitMode
                    ? "rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                    : "rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                }
              >
                {splitMode ? "Aktif" : "Nonaktif"}
              </span>
            </button>

            {splitMode && (
              <div className="mt-3 border-t border-border/60 pt-3">
                <ParticipantEditor people={people} onChange={setPeople} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Item ({items.length})</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={addItem}
              >
                <Plus size={14} weight="bold" />
                Tambah item
              </Button>
            </div>
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

                  {splitMode && (
                    <div className="flex flex-col gap-2 border-t border-border/60 pt-2">
                      <AssigneeToggles
                        people={people}
                        value={item.assignees}
                        onChange={(assignees) => updateItem(i, { assignees })}
                        label={`Penanggung item ${i + 1}`}
                      />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={item.shared}
                          onChange={(e) =>
                            updateItem(i, { shared: e.target.checked })
                          }
                          className="size-3.5 accent-primary"
                        />
                        Biaya bersama · dibagi proporsional; tanpa penanda
                        berarti semua orang
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {splitMode && people.length > 0 && (
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Pembagian
              </p>
              <ul className="flex flex-col gap-1.5">
                <li className="flex items-center gap-2 text-sm">
                  <span className="flex-1 font-medium">Saya</span>
                  <span className="font-mono font-medium">
                    {formatIDR(split.myAmount)}
                  </span>
                </li>
                {people.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1">{p.name}</span>
                    <span className="font-mono">
                      {formatIDR(
                        split.shares.find((s) => s.id === p.id)?.amount ?? 0
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t border-border/60 pt-2 text-sm">
                <span className="text-muted-foreground">Total nota</span>
                <span className="font-mono font-semibold">
                  {formatIDR(split.total)}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full gap-1.5"
                onClick={copySplitText}
              >
                <Copy size={14} />
                Salin ringkasan tagihan
              </Button>
            </div>
          )}

          {groups.size > 0 && (
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {splitMode
                  ? `Bagianmu dicatat sebagai ${groups.size} transaksi`
                  : `Akan disimpan sebagai ${groups.size} transaksi`}
              </p>
              <ul className="flex flex-col gap-1.5">
                {[...groups.entries()].map(([cat, total]) => (
                  <li key={cat} className="flex items-center gap-2 text-sm">
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
                <span className="text-muted-foreground">
                  {splitMode ? "Masuk pengeluaran" : "Jumlah item"}
                </span>
                <span className="font-mono font-semibold">
                  {formatIDR(ledgerSum)}
                </span>
              </div>
              {totalMismatch && data && (
                <div className="mt-1.5 flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">
                    Total di nota terbaca {formatIDR(data.total)}, selisih{" "}
                    {formatIDR(Math.abs(diff))}
                    {diff > 0
                      ? " (biasanya pajak/servis yang tidak terbaca per item)."
                      : ". Periksa nominal item."}
                  </p>
                  {diff > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={addDifferenceItem}
                    >
                      Tambahkan selisih sebagai &ldquo;Pajak & Layanan&rdquo;
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <Button type="submit" disabled={pending}>
            {pending
              ? "Menyimpan..."
              : splitMode
                ? "Simpan Patungan"
                : groups.size > 1
                  ? `Simpan ${groups.size} Transaksi`
                  : "Simpan Transaksi"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
