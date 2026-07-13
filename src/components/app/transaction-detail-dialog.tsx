"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/app/category-icon";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatDateID, formatIDR } from "@/lib/format";
import { api, apiErrorMessage } from "@/lib/api";

async function fetchDetail(id: string) {
  const { data, error } = await api.transactions({ id }).get();
  if (error) throw new Error(apiErrorMessage(error.value, "Gagal memuat detail"));
  return data;
}

export function TransactionDetailDialog({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const { data, isPending } = useQuery({
    queryKey: ["transaction-detail", id],
    queryFn: () => fetchDetail(id!),
    enabled: Boolean(id),
  });

  return (
    <Dialog open={Boolean(id)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rincian Nota</DialogTitle>
        </DialogHeader>

        {isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded-lg" />
            ))}
          </div>
        ) : data ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-medium">{data.title}</p>
              <p className="text-xs text-muted-foreground">
                {CATEGORY_LABELS[data.category]} · {formatDateID(data.date)}
              </p>
            </div>

            {data.items.length > 0 ? (
              <ul className="flex flex-col gap-1.5 rounded-xl bg-muted/50 p-3">
                {data.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-baseline justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {item.name}
                      {item.quantity > 1 && (
                        <span className="text-muted-foreground">
                          {" "}
                          x{item.quantity}
                        </span>
                      )}
                    </span>
                    <span className="font-mono">{formatIDR(item.amount)}</span>
                  </li>
                ))}
                <li className="mt-1 flex justify-between border-t border-border/60 pt-2 text-sm font-medium">
                  <span>Total</span>
                  <span className="font-mono">{formatIDR(data.amount)}</span>
                </li>
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tidak ada rincian item untuk transaksi ini.
              </p>
            )}

            {data.siblings.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">
                  Dari nota yang sama:
                </p>
                <ul className="flex flex-col gap-1.5">
                  {data.siblings.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-sm">
                      <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <CategoryIcon category={s.category} size={14} />
                      </span>
                      <span className="flex-1">
                        {CATEGORY_LABELS[s.category]}
                      </span>
                      <span className="font-mono">{formatIDR(s.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
