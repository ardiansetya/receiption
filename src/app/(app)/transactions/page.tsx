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
import {
  ReceiptReviewDialog,
  type ReceiptReviewData,
} from "@/components/app/receipt-review-dialog";
import { TransactionDetailDialog } from "@/components/app/transaction-detail-dialog";
import type { Category, Transaction } from "@/db/schema";
import { CATEGORY_LABELS } from "@/lib/categories";
import {
  currentMonth,
  formatDateID,
  formatIDR,
  formatMonthLong,
} from "@/lib/format";
import { api, apiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const ALL = "semua";

/** Periode pengelompokan daftar transaksi. */
type Periode = "hari" | "bulan" | "tahun" | "semua";
/** Filter jenis transaksi. */
type Tipe = "expense" | "income" | "all";

const periodeItems: { value: Periode; label: string }[] = [
  { value: "bulan", label: "Per bulan" },
  { value: "hari", label: "Per hari" },
  { value: "tahun", label: "Per tahun" },
  { value: "semua", label: "Semua waktu" },
];

const tipeItems: { value: Tipe; label: string }[] = [
  { value: "expense", label: "Pengeluaran" },
  { value: "income", label: "Pemasukan" },
  { value: "all", label: "Semua" },
];

/** Kunci bucket per periode dari tanggal transaksi (YYYY-MM-DD). */
function periodKey(date: string, periode: Periode): string {
  if (periode === "hari") return date;
  if (periode === "bulan") return date.slice(0, 7);
  if (periode === "tahun") return date.slice(0, 4);
  return "all";
}

/** Label bucket yang tampil di header grup. */
function periodLabel(key: string, periode: Periode): string {
  if (periode === "hari") return formatDateID(key);
  if (periode === "bulan") return formatMonthLong(key);
  if (periode === "tahun") return key;
  return "Semua waktu";
}

/**
 * Kelompokkan transaksi (sudah terurut tanggal desc) per periode terpilih
 * dengan total bersih tiap bucket: pemasukan plus, pengeluaran minus.
 */
function groupByPeriod(items: Transaction[], periode: Periode) {
  const groups: { key: string; total: number; rows: Transaction[] }[] = [];
  for (const t of items) {
    const signed = t.type === "income" ? Number(t.amount) : -Number(t.amount);
    const key = periodKey(t.date, periode);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.rows.push(t);
      last.total += signed;
    } else {
      groups.push({ key, total: signed, rows: [t] });
    }
  }
  return groups;
}

async function fetchTransactions(opts: {
  periode: Periode;
  tipe: Tipe;
  category: string;
  month: string;
}): Promise<{ items: Transaction[]; total: number }> {
  const { data, error } = await api.transactions.get({
    query: {
      limit: 500,
      /* Hanya "per hari" yang dibatasi satu bulan; periode lain lintas waktu */
      ...(opts.periode === "hari" ? { month: opts.month } : {}),
      ...(opts.tipe !== "all" ? { type: opts.tipe } : {}),
      ...(opts.category !== ALL ? { category: opts.category as Category } : {}),
    },
  });
  if (error) {
    throw new Error(apiErrorMessage(error.value, "Gagal memuat transaksi"));
  }
  return data;
}

function TransactionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const [month, setMonth] = useState(currentMonth());
  const [category, setCategory] = useState<string>(ALL);
  const [periode, setPeriode] = useState<Periode>("bulan");
  const [tipe, setTipe] = useState<Tipe>("expense");
  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "1");
  const [scanOpen, setScanOpen] = useState(searchParams.get("scan") === "1");
  const [editing, setEditing] = useState<TransactionDraft | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewData, setReviewData] = useState<ReceiptReviewData | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ["transactions", periode, tipe, month, category],
    queryFn: () => fetchTransactions({ periode, tipe, category, month }),
  });

  /* Total keseluruhan filter aktif: bersih (pemasukan plus, pengeluaran minus) */
  const grandTotal = (data?.items ?? []).reduce(
    (sum, t) => sum + (t.type === "income" ? Number(t.amount) : -Number(t.amount)),
    0
  );
  const totalLabel =
    tipe === "expense"
      ? "Total pengeluaran"
      : tipe === "income"
        ? "Total pemasukan"
        : "Total bersih";

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.transactions({ id }).delete();
      if (error) throw new Error("Gagal menghapus transaksi");
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
        <Select
          items={periodeItems}
          value={periode}
          onValueChange={(v) => v && setPeriode(v as Periode)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Periode" />
          </SelectTrigger>
          <SelectContent>
            {periodeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={tipeItems}
          value={tipe}
          onValueChange={(v) => v && setTipe(v as Tipe)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Jenis" />
          </SelectTrigger>
          <SelectContent>
            {tipeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {periode === "hari" && (
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-40"
          />
        )}
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
                Belum ada transaksi untuk filter ini. Catat manual atau scan
                struk belanjamu.
              </p>
              <Button size="sm" onClick={openCreate}>
                Catat Transaksi
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {groupByPeriod(data.items, periode).map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between px-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {periodLabel(group.key, periode)}
                  </p>
                  <p
                    className={cn(
                      "font-mono text-xs font-semibold",
                      group.total >= 0 ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {group.total >= 0 ? "+" : "-"}
                    {formatIDR(Math.abs(group.total))}
                  </p>
                </div>
                {group.rows.map((t) => (
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
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => t.source === "ocr" && setDetailId(t.id)}
                  disabled={t.source !== "ocr"}
                  aria-label={
                    t.source === "ocr"
                      ? `Lihat rincian nota ${t.title}`
                      : undefined
                  }
                >
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[t.category]}
                    {t.source === "ocr" ? " · dari struk" : ""}
                  </p>
                </button>
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
            ))}

            {/* Total keseluruhan filter aktif */}
            <div className="sticky bottom-4 mt-2 flex items-center justify-between rounded-xl border border-border/60 bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
              <span className="text-sm font-medium">{totalLabel}</span>
              <span
                className={cn(
                  "font-mono text-base font-bold",
                  tipe === "income"
                    ? "text-primary"
                    : tipe === "expense"
                      ? "text-foreground"
                      : grandTotal >= 0
                        ? "text-primary"
                        : "text-foreground"
                )}
              >
                {tipe === "all" ? (grandTotal >= 0 ? "+" : "-") : ""}
                {formatIDR(Math.abs(grandTotal))}
              </span>
            </div>
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
        onResult={(result) => {
          if (result.items.length > 0) {
            setReviewData({
              storeName: result.storeName,
              date: result.date,
              total: result.total,
              items: result.items,
            });
            setReviewOpen(true);
          } else {
            /* Item tidak terbaca: fallback satu transaksi */
            setEditing({
              type: "expense",
              category: result.category,
              amount: result.total,
              title: result.storeName,
              note: "",
              date: result.date,
              source: "ocr",
            });
            setFormOpen(true);
          }
        }}
      />

      <ReceiptReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        data={reviewData}
      />

      <TransactionDetailDialog
        id={detailId}
        onClose={() => setDetailId(null)}
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
