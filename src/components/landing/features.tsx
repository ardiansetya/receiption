"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  Receipt,
  Wallet,
  PiggyBank,
  ChartBar,
  Lightbulb,
} from "@phosphor-icons/react";
import { Progress } from "@/components/ui/progress";

const ease = [0.16, 1, 0.3, 1] as const;

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="fitur" className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <h2 className="max-w-lg text-3xl font-semibold tracking-tighter md:text-4xl">
          Semua yang kamu butuhkan untuk paham keuanganmu.
        </h2>

        <div className="mt-12 grid gap-4 md:grid-cols-6">
          {/* OCR: sel utama, latar gradient emerald */}
          <Reveal className="md:col-span-4">
            <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-primary/10 via-card to-card p-7">
              <div>
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Receipt size={22} />
                </span>
                <h3 className="mt-5 text-xl font-medium">AI OCR Struk</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Nama toko, total pembayaran, dan tanggal terbaca dari satu
                  foto. Kategori seperti Makanan, Transportasi, atau Hiburan
                  ditentukan otomatis.
                </p>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                {["Nama toko", "Total", "Tanggal"].map((label) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border/60 bg-background/70 px-2 py-2.5 text-xs text-muted-foreground"
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Budget bulanan */}
          <Reveal delay={0.08} className="md:col-span-2">
            <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-card p-7">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wallet size={22} />
              </span>
              <h3 className="mt-5 text-xl font-medium">Budget Bulanan</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Batasi tiap kategori, pantau sisanya.
              </p>
              <div className="mt-auto flex flex-col gap-3 pt-6">
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">Makanan</span>
                    <span className="font-mono">68%</span>
                  </div>
                  <Progress value={68} className="h-1.5" />
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">Transportasi</span>
                    <span className="font-mono">41%</span>
                  </div>
                  <Progress value={41} className="h-1.5" />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Statistik */}
          <Reveal delay={0.05} className="md:col-span-2">
            <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-card p-7">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ChartBar size={22} />
              </span>
              <h3 className="mt-5 text-xl font-medium">Statistik</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Grafik kategori, tren bulanan, dan rata-rata harian.
              </p>
              <div className="mt-auto flex h-16 items-end gap-1.5 pt-6">
                {[35, 55, 42, 70, 48, 85, 62].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-primary/70"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </Reveal>

          {/* Target tabungan */}
          <Reveal delay={0.1} className="md:col-span-2">
            <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-card p-7">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PiggyBank size={22} />
              </span>
              <h3 className="mt-5 text-xl font-medium">Target Tabungan</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Pasang target, lihat progresnya bergerak.
              </p>
              <div className="mt-auto pt-6">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted-foreground">Beli laptop</span>
                  <span className="font-mono">Rp8,4jt / Rp15jt</span>
                </div>
                <Progress value={56} className="h-1.5" />
              </div>
            </div>
          </Reveal>

          {/* Insight AI: latar tinted */}
          <Reveal delay={0.15} className="md:col-span-2">
            <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-linear-to-b from-card to-primary/5 p-7">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Lightbulb size={22} />
              </span>
              <h3 className="mt-5 text-xl font-medium">Insight AI</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Saran singkat yang bisa langsung dipraktikkan.
              </p>
              <p className="mt-auto rounded-xl border border-primary/20 bg-background/70 p-3 pt-3 text-xs leading-relaxed text-foreground/80">
                &ldquo;Pengeluaran makananmu naik 25% dibanding bulan lalu.
                Kurangi jajan kopi dan kamu hemat sekitar Rp180.000.&rdquo;
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

