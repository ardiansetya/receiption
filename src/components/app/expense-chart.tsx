"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatIDR, formatIDRCompact, formatMonthShort } from "@/lib/format";

type Point = { month: string; expense: number };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{formatMonthShort(p.month)}</p>
      <p className="mt-0.5 font-mono font-medium text-foreground">
        {formatIDR(p.expense)}
      </p>
    </div>
  );
}

export function ExpenseChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid
          vertical={false}
          stroke="var(--border)"
          strokeDasharray="0"
        />
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
          content={<ChartTooltip />}
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
        />
        <Bar
          dataKey="expense"
          fill="var(--chart-1)"
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
