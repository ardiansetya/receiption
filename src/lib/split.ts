import type { Category } from "@/db/schema";
import { formatDateID, formatIDR } from "@/lib/format";

/* Id semu untuk pemilik tagihan; peserta lain memakai id acak dari client. */
export const ME = "me";

export type SplitItem = {
  name: string;
  quantity: number;
  amount: number;
  category: Category;
  /* Biaya bersama (pajak/servis/ongkir): dibagi proporsional, bukan rata */
  shared: boolean;
  assignees: string[];
};

export type SplitShare = {
  id: string;
  amount: number;
  items: { name: string; amount: number; category: Category }[];
};

export type SplitResult = {
  total: number;
  myAmount: number;
  /* Selalu berisi semua id, urut: ME lalu urutan participantIds */
  shares: SplitShare[];
};

/**
 * Bagi `amount` (rupiah bulat) menurut `weights` tanpa kehilangan satu rupiah pun.
 * Largest remainder method; sisa pembulatan didahulukan ke `preferIndex`
 * (pemilik tagihan) supaya total peserta lain tidak pernah kelebihan.
 */
function allocate(amount: number, weights: number[], preferIndex: number) {
  const n = weights.length;
  if (n === 0) return [];

  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const effective = totalWeight > 0 ? weights : new Array<number>(n).fill(1);
  const effectiveTotal = totalWeight > 0 ? totalWeight : n;

  const raw = effective.map((w) => (amount * w) / effectiveTotal);
  const result = raw.map((r) => Math.floor(r));
  let rest = amount - result.reduce((s, v) => s + v, 0);

  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => {
      if (b.frac !== a.frac) return b.frac - a.frac;
      if (a.i === preferIndex) return -1;
      if (b.i === preferIndex) return 1;
      return a.i - b.i;
    });

  for (const { i } of order) {
    if (rest <= 0) break;
    result[i] += 1;
    rest -= 1;
  }

  return result;
}

/**
 * Hitung porsi tiap orang dari daftar item yang sudah ditandai pemiliknya.
 * Dipakai di dua tempat dengan hasil identik: preview di dialog review
 * dan penyimpanan di server (server tidak percaya angka dari client).
 */
export function computeSplit(
  items: SplitItem[],
  participantIds: string[]
): SplitResult {
  const ids = [ME, ...participantIds];
  const indexOf = new Map(ids.map((id, i) => [id, i]));
  const meIndex = 0;

  const totals = new Array<number>(ids.length).fill(0);
  const detail: SplitShare["items"][] = ids.map(() => []);

  const resolve = (item: SplitItem) => {
    const valid = item.assignees.filter((a) => indexOf.has(a));
    if (valid.length > 0) return valid;
    /* Tanpa penanda: biaya bersama menyebar ke semua, item biasa jadi milik pemilik tagihan */
    return item.shared ? ids : [ME];
  };

  const record = (index: number, item: SplitItem, amount: number) => {
    if (amount <= 0) return;
    totals[index] += amount;
    detail[index].push({
      name: item.name,
      amount,
      category: item.category,
    });
  };

  const direct = items.filter((i) => !i.shared);
  const shared = items.filter((i) => i.shared);

  for (const item of direct) {
    const targets = resolve(item);
    const parts = allocate(
      item.amount,
      new Array<number>(targets.length).fill(1),
      targets.indexOf(ME)
    );
    targets.forEach((id, i) => record(indexOf.get(id)!, item, parts[i]));
  }

  /* Bobot biaya bersama = subtotal item langsung; nol berarti jatuh ke bagi rata */
  const subtotals = [...totals];

  for (const item of shared) {
    const targets = resolve(item);
    const weights = targets.map((id) => subtotals[indexOf.get(id)!]);
    const parts = allocate(item.amount, weights, targets.indexOf(ME));
    targets.forEach((id, i) => record(indexOf.get(id)!, item, parts[i]));
  }

  return {
    total: items.reduce((s, i) => s + i.amount, 0),
    myAmount: totals[meIndex],
    shares: ids.map((id, i) => ({ id, amount: totals[i], items: detail[i] })),
  };
}

export type SplitTextInput = {
  title: string;
  date: string;
  totalAmount: number;
  myAmount: number;
  participants: {
    name: string;
    amount: number;
    settledAt?: string | Date | null;
    items: { name: string; amount: number }[];
  }[];
};

/** Ringkasan tagihan sebagai teks polos, siap ditempel ke WhatsApp. */
export function formatSplitText(bill: SplitTextInput): string {
  const lines = [
    `Patungan di ${bill.title} — ${formatDateID(bill.date)}`,
    `Total ${formatIDR(bill.totalAmount)}`,
    "",
  ];

  for (const p of bill.participants) {
    lines.push(
      `${p.name}: ${formatIDR(p.amount)}${p.settledAt ? " (lunas)" : ""}`
    );
    for (const item of p.items) {
      lines.push(`  - ${item.name} ${formatIDR(item.amount)}`);
    }
  }

  lines.push("", `Bagian saya: ${formatIDR(bill.myAmount)}`);
  return lines.join("\n");
}
