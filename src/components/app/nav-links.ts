import {
  SquaresFour,
  Receipt,
  Wallet,
  ChartBar,
  PiggyBank,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";

export type NavLink = {
  href: string;
  label: string;
  icon: Icon;
};

export const navLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: SquaresFour },
  { href: "/transactions", label: "Transaksi", icon: Receipt },
  { href: "/splits", label: "Patungan", icon: UsersThree },
  { href: "/budgets", label: "Budget", icon: Wallet },
  { href: "/stats", label: "Statistik", icon: ChartBar },
  { href: "/goals", label: "Tabungan", icon: PiggyBank },
];
