"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  Camera,
  ForkKnife,
  Car,
  Coffee,
  CheckCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ease = [0.16, 1, 0.3, 1] as const;

/* Preview transaksi: versi mini dari kartu transaksi yang dipakai di aplikasi. */
const previewRows = [
  {
    icon: Coffee,
    store: "Kopi Tuku Margonda",
    category: "Minuman",
    amount: "Rp27.000",
    date: "Hari ini",
  },
  {
    icon: ForkKnife,
    store: "Warteg Bahari",
    category: "Makanan",
    amount: "Rp18.500",
    date: "Hari ini",
  },
  {
    icon: Car,
    store: "Gojek",
    category: "Transportasi",
    amount: "Rp24.000",
    date: "Kemarin",
  },
];

export function Hero() {
  const reduce = useReducedMotion();

  const fadeUp = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease },
  });

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 md:grid-cols-2 md:gap-8 md:px-6 md:pb-28 md:pt-24">
        {/* Kiri: pesan utama */}
        <div className="flex flex-col items-start">
          <motion.h1
            {...fadeUp(0)}
            className="text-4xl font-semibold tracking-tighter text-foreground md:text-5xl lg:text-6xl"
          >
            Foto struk.
            <br />
            Keuangan tercatat.
          </motion.h1>

          <motion.p
            {...fadeUp(0.1)}
            className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            AI membaca struk belanjamu, mencatat transaksi, dan mengategorikan
            otomatis. Tanpa input manual.
          </motion.p>

          <motion.div {...fadeUp(0.2)} className="mt-8 flex items-center gap-3">
            <Button size="lg" render={<Link href="/register" />}>
              Mulai Gratis
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="#cara-kerja" />}
            >
              Lihat Cara Kerja
            </Button>
          </motion.div>
        </div>

        {/* Kanan: preview hasil scan, komponen asli aplikasi versi mini */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease }}
          className="relative mx-auto w-full max-w-sm md:max-w-md"
        >
          <div className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-emerald-950/5 dark:shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Camera size={18} className="text-primary" weight="fill" />
                Struk terbaca
              </div>
              <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                <CheckCircle size={13} weight="fill" />
                Otomatis
              </Badge>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {previewRows.map((row, i) => (
                <motion.div
                  key={row.store}
                  initial={reduce ? false : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.15, ease }}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-3"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <row.icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.store}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium">
                      {row.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">{row.date}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.05, ease }}
              className="mt-4 flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3"
            >
              <span className="text-xs text-muted-foreground">
                Pengeluaran minggu ini
              </span>
              <span className="font-mono text-sm font-semibold text-primary">
                Rp312.500
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
