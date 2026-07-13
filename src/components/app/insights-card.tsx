"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Lightbulb,
  TrendUp,
  Warning,
  Info,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, apiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

async function fetchInsights() {
  const { data, error } = await api.insights.get();
  if (error) {
    throw new Error(apiErrorMessage(error.value, "Gagal memuat insight."));
  }
  return data;
}

const toneStyles = {
  positive: { icon: TrendUp, className: "bg-primary/10 text-primary" },
  warning: { icon: Warning, className: "bg-destructive/10 text-destructive" },
  info: { icon: Info, className: "bg-muted text-muted-foreground" },
} as const;

export function InsightsCard() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["insights"],
    queryFn: fetchInsights,
    staleTime: 5 * 60_000,
    retry: 0,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Lightbulb size={18} className="text-primary" />
          Insight AI
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Insight belum tersedia. Coba lagi nanti."}
          </p>
        ) : !data || data.insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Insight akan muncul setelah kamu punya beberapa transaksi.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {data.insights.map((insight, i) => {
              const tone = toneStyles[insight.tone] ?? toneStyles.info;
              return (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                      tone.className
                    )}
                  >
                    <tone.icon size={14} weight="bold" />
                  </span>
                  <span className="leading-relaxed">{insight.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
