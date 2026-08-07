"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Wallet,
  PiggyBank,
  Receipt,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightsCard } from "@/components/app/insights-card";
import { formatIDR, formatMonthLong, currentMonth } from "@/lib/format";
import { api, apiErrorMessage } from "@/lib/api";

/* Recharts besar dan tidak pernah jadi elemen LCP: keluarkan dari bundle awal. */
const ExpenseChart = dynamic(
  () => import("@/components/app/expense-chart").then((m) => m.ExpenseChart),
  { ssr: false, loading: () => <Skeleton className="h-55 w-full rounded-lg" /> }
);

async function fetchSummary() {
  const { data, error } = await api.summary.get({
    query: { month: currentMonth() },
  });
  if (error) throw new Error(apiErrorMessage(error.value, "Gagal memuat ringkasan"));
  return data;
}

export function DashboardClient() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["summary"],
    queryFn: fetchSummary,
  });

  const hasData =
    data &&
    (data.balance !== 0 ||
      data.monthIncome > 0 ||
      data.monthExpense > 0 ||
      data.series.some((s) => s.expense > 0 || s.income > 0));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMonthLong(currentMonth())}
          </p>
        </div>
        <Button render={<Link href="/transactions?new=1" />} className="gap-1.5">
          <Plus size={16} weight="bold" />
          Catat Transaksi
        </Button>
      </div>

      {isError && (
        <Card className="mt-6">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Gagal memuat data. Muat ulang halaman untuk coba lagi.
          </CardContent>
        </Card>
      )}

      {isPending && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
          <Skeleton className="h-72 rounded-xl sm:col-span-2 lg:col-span-4" />
        </div>
      )}

      {data && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">
                  Total Saldo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-2xl font-semibold tracking-tight">
                  {formatIDR(data.balance)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                  <ArrowUp size={14} className="text-primary" weight="bold" />
                  Pemasukan Bulan Ini
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-2xl font-semibold tracking-tight">
                  {formatIDR(data.monthIncome)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                  <ArrowDown
                    size={14}
                    className="text-destructive"
                    weight="bold"
                  />
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
                <CardTitle className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                  <Wallet size={14} weight="bold" />
                  Sisa Budget
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.budgetTotal > 0 ? (
                  <>
                    <p className="font-mono text-2xl font-semibold tracking-tight">
                      {formatIDR(data.budgetRemaining)}
                    </p>
                    <Progress
                      value={Math.min(
                        (data.budgetSpent / data.budgetTotal) * 100,
                        100
                      )}
                      className="mt-2 h-1.5"
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Belum ada budget.{" "}
                    <Link
                      href="/budgets"
                      className="text-primary hover:underline"
                    >
                      Buat
                    </Link>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  Pengeluaran 6 Bulan Terakhir
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasData ? (
                  <ExpenseChart data={data.series} />
                ) : (
                  <div className="flex h-55 flex-col items-center justify-center gap-3 text-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Receipt size={24} />
                    </span>
                    <p className="max-w-56 text-sm text-muted-foreground">
                      Belum ada transaksi. Mulai dengan mencatat pengeluaran
                      pertamamu.
                    </p>
                    <Button
                      size="sm"
                      render={<Link href="/transactions?new=1" />}
                    >
                      Catat Sekarang
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <PiggyBank size={18} className="text-primary" />
                  Progress Tabungan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.goalCount > 0 ? (
                  <>
                    <p className="font-mono text-2xl font-semibold tracking-tight">
                      {formatIDR(data.goalSaved)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      dari target {formatIDR(data.goalTarget)}
                    </p>
                    <Progress
                      value={
                        data.goalTarget > 0
                          ? Math.min(
                              (data.goalSaved / data.goalTarget) * 100,
                              100
                            )
                          : 0
                      }
                      className="mt-3 h-1.5"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      render={<Link href="/goals" />}
                    >
                      Lihat Semua Target
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-start gap-3">
                    <p className="text-sm text-muted-foreground">
                      Belum ada target tabungan. Pasang target pertamamu,
                      misalnya beli laptop.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href="/goals" />}
                    >
                      Buat Target
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {hasData && (
            <div className="mt-4">
              <InsightsCard />
            </div>
          )}
        </>
      )}
    </div>
  );
}
