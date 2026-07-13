/** Rentang tanggal satu bulan penuh (YYYY-MM-DD) dari string YYYY-MM. */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  return {
    start: `${month}-01`,
    end: `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`,
  };
}

/** Bulan sebelumnya dalam format YYYY-MM. */
export function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
