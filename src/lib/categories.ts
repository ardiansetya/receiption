import type { Category } from "@/db/schema";

export const CATEGORY_LABELS: Record<Category, string> = {
  makanan: "Makanan",
  minuman: "Minuman",
  transportasi: "Transportasi",
  belanja: "Belanja",
  hiburan: "Hiburan",
  pendidikan: "Pendidikan",
  kesehatan: "Kesehatan",
  pemasukan: "Pemasukan",
  lainnya: "Lainnya",
};

export const EXPENSE_CATEGORIES: Category[] = [
  "makanan",
  "minuman",
  "transportasi",
  "belanja",
  "hiburan",
  "pendidikan",
  "kesehatan",
  "lainnya",
];

export function categoryLabel(c: Category): string {
  return CATEGORY_LABELS[c] ?? c;
}
