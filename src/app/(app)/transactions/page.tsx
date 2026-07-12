"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Camera,
  PencilSimple,
  Trash,
  Receipt,
} from "@phosphor-icons/react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/app/category-icon";
import {
  TransactionFormDialog,
  type TransactionDraft,
} from "@/components/app/transaction-form";
import { ReceiptScanDialog } from "@/components/app/receipt-scan-dialog";
import type { Category, Transaction } from "@/db/schema";
import { CATEGORY_LABELS } from "@/lib/categories";
import { currentMonth, formatDateID, formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

const ALL = "semua";

async function fetchTransactions(
  month: string,
  category: string
): Promise<{ items: Transaction[]; total: number }> {
  const params = new URLSearchParams({ month, limit: "100" });
  if (category !== ALL) params.set("category", category);
  const res = await fetch(`/api/transactions?${params}`);
  if (!res.ok) throw new Error("Gagal memuat transaksi");
  return res.json();
}

function TransactionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const [month, setMonth] = useState(currentMonth());
  const [category, setCategory] = useState<string>(ALL);
  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "1");
  const [scanOpen, setScanOpen] = useState(searchParams.get("scan") === "1");
  const [editing, setEditing] = useState<TransactionDraft | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ["transactions", month, category],
    queryFn: () => fetchTransactions(month, category),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus transaksi");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Transaksi dihapus.");
      setDeleting(null);
    },
    onError: () => toast.error("Gagal menghapus transaksi."),
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing({
      id: t.id,
      type: t.type,
      category: t.category,
      amount: Number(t.amount),
      title: t.title,
      note: t.note,
      date: t.date,
      source: t.source,
      receiptUrl: t.receiptUrl,
    });
    setFormOpen(true);
  };

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open && searchParams.get("new")) {
      router.replace(pathname);
    }
  };

  const categoryFilterItems = [
    { value: ALL, label: "Semua kategori" },
    ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transaksi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} transaksi` : "Riwayat pemasukan dan pengeluaran"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => setScanOpen(true)}
          >
            <Camera size={16} />
            Scan Struk
          </Button>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus size={16} weight="bold" />
            Catat
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-40"
        />
        <Select
          items={categoryFilterItems}
          value={category}
          onValueChange={(v) => v && setCategory(v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            {categoryFilterItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5">
        {isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Receipt size={24} />
              </span>
              <p className="max-w-64 text-sm text-muted-foreground">
                Belum ada transaksi di bulan ini. Catat manual atau scan struk
                belanjamu.
              </p>
              <Button size="sm" onClick={openCreate}>
                Catat Transaksi
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {data.items.map((t) => (
              <div
                key={t.id}
                className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5"
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    t.type === "income"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <CategoryIcon category={t.category} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[t.category]} · {formatDateID(t.date)}
                    {t.source === "ocr" ? " · dari struk" : ""}
                  </p>
                </div>
                <p
                  className={cn(
                    "font-mono text-sm font-semibold",
                    t.type === "income" ? "text-primary" : "text-foreground"
                  )}
                >
                  {t.type === "income" ? "+" : "-"}
                  {formatIDR(t.amount)}
                </p>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Edit transaksi"
                  >
                    <PencilSimple size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(t)}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Hapus transaksi"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        initial={editing}
      />

      <ReceiptScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onResult={(draft) => {
          setEditing(draft);
          setFormOpen(true);
        }}
      />

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus transaksi?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deleting?.title}&rdquo; ({formatIDR(deleting?.amount ?? 0)})
            akan dihapus permanen.
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

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsContent />
    </Suspense>
  );
}
