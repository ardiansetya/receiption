"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle, Copy, Trash, UsersThree } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateID, formatIDR } from "@/lib/format";
import { formatSplitText } from "@/lib/split";
import { api, apiErrorMessage } from "@/lib/api";

type BillSummary = {
  id: string;
  title: string;
  date: string;
  totalAmount: number;
  myAmount: number;
  participantCount: number;
  settledCount: number;
  outstanding: number;
};

async function fetchBills(): Promise<{ items: BillSummary[] }> {
  const { data, error } = await api.splits.get();
  if (error) {
    throw new Error(apiErrorMessage(error.value, "Gagal memuat patungan"));
  }
  return data;
}

async function fetchBill(id: string) {
  const { data, error } = await api.splits({ id }).get();
  if (error) {
    throw new Error(apiErrorMessage(error.value, "Gagal memuat detail"));
  }
  return data;
}

export default function SplitsPage() {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<BillSummary | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ["splits"],
    queryFn: fetchBills,
  });

  const detail = useQuery({
    queryKey: ["split-detail", openId],
    queryFn: () => fetchBill(openId!),
    enabled: Boolean(openId),
  });

  const settleMutation = useMutation({
    mutationFn: async ({
      participantId,
      settled,
    }: {
      participantId: string;
      settled: boolean;
    }) => {
      const { error } = await api
        .splits({ id: openId! })
        .participants({ participantId })
        .patch({ settled });
      if (error) {
        throw new Error(apiErrorMessage(error.value, "Gagal memperbarui status"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["splits"] });
      queryClient.invalidateQueries({ queryKey: ["split-detail", openId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.splits({ id }).delete();
      if (error) throw new Error("Gagal menghapus tagihan");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["splits"] });
      toast.success("Tagihan dihapus.");
      setDeleting(null);
      setOpenId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copyText = async () => {
    if (!detail.data) return;
    const text = formatSplitText({
      title: detail.data.title,
      date: detail.data.date,
      totalAmount: detail.data.totalAmount,
      myAmount: detail.data.myAmount,
      participants: detail.data.participants,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Ringkasan disalin.");
    } catch {
      toast.error("Gagal menyalin ke clipboard.");
    }
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Patungan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tagihan yang kamu bagi dengan teman. Buat lewat Scan Struk lalu
          aktifkan &ldquo;Bagi bareng teman&rdquo;.
        </p>
      </div>

      <div className="mt-6">
        {isPending ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UsersThree size={24} />
              </span>
              <p className="max-w-80 text-sm text-muted-foreground">
                Belum ada patungan. Scan struk makan bareng, tandai siapa makan
                apa, lalu hanya bagianmu yang masuk pengeluaran.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.items.map((b) => {
              const pct =
                b.participantCount > 0
                  ? (b.settledCount / b.participantCount) * 100
                  : 100;
              const done = b.settledCount >= b.participantCount;
              return (
                <div
                  key={b.id}
                  className="group flex flex-col rounded-xl border border-border/60 bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenId(b.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="flex items-center gap-1.5 truncate font-medium">
                        {b.title}
                        {done && (
                          <CheckCircle
                            size={16}
                            weight="fill"
                            className="shrink-0 text-primary"
                          />
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateID(b.date)} · {b.participantCount} teman
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(b)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 max-md:opacity-100"
                      aria-label={`Hapus tagihan ${b.title}`}
                    >
                      <Trash size={16} />
                    </button>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between text-sm">
                    <span className="font-mono font-medium">
                      {formatIDR(b.myAmount)}
                    </span>
                    <span className="text-muted-foreground">
                      bagianku dari {formatIDR(b.totalAmount)}
                    </span>
                  </div>
                  <Progress value={pct} className="mt-2 h-2" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {done
                      ? "Semua sudah bayar"
                      : `${b.settledCount}/${b.participantCount} lunas · belum masuk ${formatIDR(b.outstanding)}`}
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setOpenId(b.id)}
                  >
                    Lihat Rincian
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail + tandai lunas */}
      <Dialog open={Boolean(openId)} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail.data?.title ?? "Rincian Patungan"}</DialogTitle>
          </DialogHeader>

          {detail.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : detail.data ? (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-muted-foreground">
                {formatDateID(detail.data.date)} · total{" "}
                {formatIDR(detail.data.totalAmount)}
              </p>

              <div className="rounded-xl bg-muted/50 p-3">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">Bagianku</span>
                  <span className="font-mono font-semibold">
                    {formatIDR(detail.data.myAmount)}
                  </span>
                </div>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {detail.data.myItems.map((item, i) => (
                    <li
                      key={i}
                      className="flex justify-between gap-2 text-xs text-muted-foreground"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {item.name}
                      </span>
                      <span className="font-mono">{formatIDR(item.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <ul className="flex flex-col gap-2">
                {detail.data.participants.map((p) => {
                  const settled = p.settledAt !== null;
                  return (
                    <li
                      key={p.id}
                      className="rounded-xl border border-border/60 p-3"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{p.name}</span>
                        <span className="font-mono font-medium">
                          {formatIDR(p.amount)}
                        </span>
                      </div>
                      <ul className="mt-1.5 flex flex-col gap-1">
                        {p.items.map((item, i) => (
                          <li
                            key={i}
                            className="flex justify-between gap-2 text-xs text-muted-foreground"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {item.name}
                            </span>
                            <span className="font-mono">
                              {formatIDR(item.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={settled ? "outline" : "default"}
                        size="sm"
                        className="mt-3 w-full gap-1.5"
                        disabled={settleMutation.isPending}
                        onClick={() =>
                          settleMutation.mutate({
                            participantId: p.id,
                            settled: !settled,
                          })
                        }
                      >
                        {settled ? (
                          <>
                            <CheckCircle size={14} weight="fill" />
                            Sudah bayar · batalkan
                          </>
                        ) : (
                          "Tandai sudah bayar"
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>

              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={copyText}
              >
                <Copy size={16} />
                Salin ringkasan tagihan
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Hapus */}
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus tagihan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tagihan &ldquo;{deleting?.title}&rdquo; beserta rincian pesertanya
            akan dihapus permanen. Transaksi pengeluaran bagianmu yang sudah
            tercatat <strong>tidak ikut terhapus</strong>.
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
