"use client";

import { motion, useReducedMotion } from "motion/react";
import { Camera, Sparkle, ChartPieSlice } from "@phosphor-icons/react";

const ease = [0.16, 1, 0.3, 1] as const;

const steps = [
  {
    icon: Camera,
    title: "Foto struk belanjamu",
    body: "Buka aplikasi, arahkan kamera ke struk, selesai. Struk kusut atau buram tetap terbaca.",
  },
  {
    icon: Sparkle,
    title: "AI membaca dan mengategorikan",
    body: "Nama toko, total, dan tanggal terisi otomatis. Kategori langsung ditebak dengan akurat, dan tetap bisa kamu ubah.",
  },
  {
    icon: ChartPieSlice,
    title: "Lihat ke mana uangmu pergi",
    body: "Dashboard merangkum pengeluaran, sisa budget, dan progress tabunganmu setiap saat.",
  },
];

export function HowItWorks() {
  const reduce = useReducedMotion();

  return (
    <section id="cara-kerja" className="border-t border-border/60">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-[1fr_1.3fr] md:gap-16 md:px-6 md:py-28">
        <div className="md:sticky md:top-28 md:self-start">
          <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
            Tiga langkah, tanpa mengetik.
          </h2>
          <p className="mt-4 max-w-sm text-muted-foreground">
            Mencatat keuangan gagal karena ribet. Receiption memangkas semuanya
            jadi satu jepretan.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease }}
              className="flex gap-4 rounded-2xl border border-border/60 bg-card p-6"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <step.icon size={22} />
              </span>
              <div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
