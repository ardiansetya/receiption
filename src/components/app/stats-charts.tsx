"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Category } from "@/db/schema";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatIDR, formatIDRCompact, formatMonthShort } from "@/lib/format";

export function categoryColor(c: Category): string {
  return `var(--cat-${c === "pemasukan" ? "lainnya" : c})`;
}

/* ---------- Donut kategori ---------- */

type CategorySlice = { category: Category; total: number };

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CategorySlice & { pct: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{CATEGORY_LABELS[p.category]}</p>
      <p className="mt-0.5 font-mono font-medium text-foreground">
        {formatIDR(p.total)} · {p.pct.toFixed(1)}%
      </p>
    </div>
  );
}

export function CategoryDonut({ data }: { data: CategorySlice[] }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  const withPct = data.map((d) => ({
    ...d,
    pct: total > 0 ? (d.total / total) * 100 : 0,
  }));

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[200px_1fr]">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={withPct}
            dataKey="total"
            nameKey="category"
            innerRadius={58}
            outerRadius={90}
            paddingAngle={2}
            strokeWidth={2}
            stroke="var(--card)"
          >
            {withPct.map((d) => (
              <Cell key={d.category} fill={categoryColor(d.category)} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Label langsung: relief rule untuk slot kontras rendah */}
      <ul className="flex flex-col gap-2">
        {withPct.map((d) => (
          <li key={d.category} className="flex items-center gap-2.5 text-sm">
            <span
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: categoryColor(d.category) }}
            />
            <span className="flex-1 text-foreground">
              {CATEGORY_LABELS[d.category]}
            </span>
            <span className="font-mono text-muted-foreground">
              {formatIDR(d.total)}
            </span>
            <span className="w-12 text-right font-mono text-xs text-muted-foreground">
              {d.pct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Bar pemasukan vs pengeluaran ---------- */

type MonthPoint = { month: string; income: number; expense: number };

function FlowTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: MonthPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{formatMonthShort(p.month)}</p>
      <p className="mt-0.5 font-mono text-foreground">
        Masuk {formatIDR(p.income)}
      </p>
      <p className="font-mono text-foreground">
        Keluar {formatIDR(p.expense)}
      </p>
    </div>
  );
}

export function CashflowChart({ data }: { data: MonthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonthShort}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          dy={6}
        />
        <YAxis
          tickFormatter={(v: number) => formatIDRCompact(v)}
          tickLine={false}
          axisLine={false}
          width={52}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <Tooltip
          content={<FlowTooltip />}
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
        />
        <Legend
          formatter={(value: string) =>
            value === "income" ? "Pemasukan" : "Pengeluaran"
          }
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar
          dataKey="income"
          fill="var(--series-income)"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
        <Bar
          dataKey="expense"
          fill="var(--series-expense)"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
