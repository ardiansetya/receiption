const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatIDR(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "Rp0";
  return idr.format(n);
}

/* Rp1,2jt / Rp850rb untuk label ringkas di chart */
export function formatIDRCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000_000)
    return `Rp${(value / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(value) >= 1_000_000)
    return `Rp${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  if (Math.abs(value) >= 1_000)
    return `Rp${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })}rb`;
  return `Rp${value}`;
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export function formatMonthShort(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${monthNames[m - 1]} ${String(y).slice(2)}`;
}

export function formatMonthLong(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const full = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${full[m - 1]} ${y}`;
}

export function formatDateID(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
