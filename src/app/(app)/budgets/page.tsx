"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Wallet, Trash, PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/app/category-icon";
import type { Category } from "@/db/schema";
import { CATEGORY_LABELS, EXPENSE_CATEGORIES } from "@/lib/categories";
import { currentMonth, formatIDR } from "@/lib/format";
import { api, apiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

type BudgetItem = {
  id: string;
  category: Category;
  amount: number;
  spent: number;
};

async function fetchBudgets(
  month: string
): Promise<{ month: string; items: BudgetItem[] }> {
  const { data, error } = await api.budgets.get({ query: { month } });
  if (error) throw new Error(apiErrorMessage(error.value, "Gagal memuat budget"));
  return data;
}

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonth());
  const [formOpen, setFormOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [deleting, setDeleting] = useState<BudgetItem | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ["budgets", month],
    queryFn: () => fetchBudgets(month),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (input: { category: Category; amount: number }) => {
      const { error } = await api.budgets.put({ ...input, month });
      if (error) {
        throw new Error(apiErrorMessage(error.value, "Gagal menyimpan budget"));
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Budget disimpan.");
      setFormOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.budgets({ id }).delete();
      if (error) throw new Error("Gagal menghapus budget");
    },
    onSuccess: () => {
      invalidate();
      toast.success("Budget dihapus.");
      setDeleting(null);
    },
    onError: () => toast.error("Gagal menghapus budget."),
  });

  const budgetedCategories = new Set(data?.items.map((b) => b.category) ?? []);
  const availableCategories = EXPENSE_CATEGORIES.filter(
    (c) => !budgetedCategories.has(c) || c === editCategory
  );

  const openCreate = () => {
    setEditCategory(null);
    setSelectedCategory(availableCategories[0] ?? null);
    setAmount(0);
    setFormOpen(true);
  };

  const openEdit = (b: BudgetItem) => {
    setEditCategory(b.category);
    setSelectedCategory(b.category);
    setAmount(b.amount);
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    if (amount <= 0) {
      toast.error("Nominal harus lebih dari 0.");
      return;
    }
    saveMutation.mutate({ category: selectedCategory, amount });
  };

  const totalBudget = data?.items.reduce((s, b) => s + b.amount, 0) ?? 0;
  const totalSpent = data?.items.reduce((s, b) => s + b.spent, 0) ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Batas pengeluaran per kategori
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus size={16} weight="bold" />
          Tambah Budget
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-40"
        />
        {data && data.items.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Terpakai{" "}
            <span className="font-mono font-medium text-foreground">
              {formatIDR(totalSpent)}
            </span>{" "}
            dari{" "}
            <span className="font-mono font-medium text-foreground">
              {formatIDR(totalBudget)}
            </span>
          </p>
        )}
      </div>

      <div className="mt-5">
        {isPending ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Wallet size={24} />
              </span>
              <p className="max-w-72 text-sm text-muted-foreground">
                Belum ada budget untuk bulan ini. Mulai dari kategori
                pengeluaran terbesarmu, misalnya makanan.
              </p>
              <Button size="sm" onClick={openCreate}>
                Buat Budget
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.items.map((b) => {
              const pct = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
              const over = b.spent > b.amount;
              const warning = !over && pct >= 80;
              return (
                <div
                  key={b.id}
                  className="group rounded-xl border border-border/60 bg-card p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CategoryIcon category={b.category} />
                      </span>
                      <span className="font-medium">
                        {CATEGORY_LABELS[b.category]}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Edit budget"
                      >
                        <PencilSimple size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(b)}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Hapus budget"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between text-sm">
                    <span className="font-mono font-medium">
                      {formatIDR(b.spent)}
                    </span>
                    <span className="text-muted-foreground">
                      dari {formatIDR(b.amount)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(pct, 100)}
                    className={cn(
                      "mt-2 h-2",
                      over && "[&>[data-slot=progress-indicator]]:bg-destructive"
                    )}
                  />
                  <p
                    className={cn(
                      "mt-2 text-xs",
                      over
                        ? "font-medium text-destructive"
                        : warning
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                    )}
                  >
                    {over
                      ? `Lewat budget ${formatIDR(b.spent - b.amount)}`
                      : warning
                        ? `Hampir habis, sisa ${formatIDR(b.amount - b.spent)}`
                        : `Sisa ${formatIDR(b.amount - b.spent)}`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editCategory ? "Edit Budget" : "Tambah Budget"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Kategori</Label>
              <Select
                items={availableCategories.map((c) => ({
                  value: c,
                  label: CATEGORY_LABELS[c],
                }))}
                value={selectedCategory}
                onValueChange={(v) =>
                  v && setSelectedCategory(v as Category)
                }
                disabled={Boolean(editCategory)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="budget-amount">Nominal (Rp)</Label>
              <Input
                id="budget-amount"
                type="number"
                required
                min={1}
                step={1}
                inputMode="numeric"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Budget"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus budget?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Budget {deleting ? CATEGORY_LABELS[deleting.category] : ""} (
            {formatIDR(deleting?.amount ?? 0)}) untuk bulan ini akan dihapus.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
