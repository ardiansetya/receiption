"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartBar } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CategoryDonut,
  CashflowChart,
} from "@/components/app/stats-charts";
import type { Category } from "@/db/schema";
import { CATEGORY_LABELS } from "@/lib/categories";
import { currentMonth, formatIDR } from "@/lib/format";

type Stats = {
  month: string;
  monthExpense: number;
  avgDaily: number;
  byCategory: { category: Category; total: number }[];
  series: { month: string; income: number; expense: number }[];
};

async function fetchStats(month: string): Promise<Stats> {
  const res = await fetch(`/api/stats?month=${month}`);
  if (!res.ok) throw new Error("Gagal memuat statistik");
  return res.json();
}

export default function StatsPage() {
  const [month, setMonth] = useState(currentMonth());
  const { data, isPending } = useQuery({
    queryKey: ["stats", month],
    queryFn: () => fetchStats(month),
  });

  const top = data?.byCategory[0];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Statistik</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pola pengeluaran dan pemasukanmu
          </p>
        </div>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-40"
        />
      </div>

      {isPending && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      )}

      {data &&
        (data.byCategory.length === 0 &&
        data.series.every((s) => s.income === 0 && s.expense === 0) ? (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ChartBar size={24} />
              </span>
              <p className="max-w-72 text-sm text-muted-foreground">
                Statistik akan muncul setelah ada transaksi. Catat pengeluaran
                pertamamu dulu.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-muted-foreground">
                    Pengeluaran Bulan Ini
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-2xl font-semibold tracking-tight">
                    {formatIDR(data.monthExpense)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-muted-foreground">
                    Rata-rata Harian
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-2xl font-semibold tracking-tight">
                    {formatIDR(data.avgDaily)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-muted-foreground">
                    Kategori Terbesar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {top ? (
                    <>
                      <p className="text-2xl font-semibold tracking-tight">
                        {CATEGORY_LABELS[top.category]}
                      </p>
                      <p className="mt-0.5 font-mono text-sm text-muted-foreground">
                        {formatIDR(top.total)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Belum ada pengeluaran
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {data.byCategory.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">
                    Pengeluaran per Kategori
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CategoryDonut data={data.byCategory} />
                </CardContent>
              </Card>
            )}

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">
                  Arus Kas 6 Bulan Terakhir
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CashflowChart data={data.series} />
              </CardContent>
            </Card>
          </>
        ))}
    </div>
  );
}
