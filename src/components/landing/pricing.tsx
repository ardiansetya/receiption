"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ease = [0.16, 1, 0.3, 1] as const;

const plans = [
  {
    name: "Free",
    price: "Rp0",
    period: "selamanya",
    description: "Cukup untuk mulai membangun kebiasaan mencatat.",
    features: [
      "30 scan struk per bulan",
      "Pencatatan transaksi manual",
      "Budget dasar per kategori",
      "Dashboard ringkasan",
    ],
    cta: "Mulai Gratis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "Rp29.000",
    period: "per bulan",
    description: "Untuk yang serius mengelola uangnya.",
    features: [
      "Scan struk tanpa batas",
      "Insight AI lengkap",
      "Statistik lanjutan",
      "Target tabungan tanpa batas",
      "Export PDF dan Excel",
      "Backup cloud",
    ],
    cta: "Coba Pro",
    highlighted: true,
  },
];

export function Pricing() {
  const reduce = useReducedMotion();

  return (
    <section id="harga" className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
            Mulai gratis, upgrade kalau butuh.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Tidak ada kartu kredit. Tidak ada biaya tersembunyi.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.1, ease }}
              className={`relative flex flex-col rounded-2xl border p-7 ${
                plan.highlighted
                  ? "border-primary/40 bg-linear-to-b from-primary/5 to-card shadow-lg shadow-emerald-950/5 dark:shadow-none"
                  : "border-border/60 bg-card"
              }`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-2.5 right-6">
                  Paling populer
                </Badge>
              )}
              <h3 className="text-lg font-medium">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-mono text-3xl font-semibold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {plan.period}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {plan.description}
              </p>
              <ul className="mt-6 flex flex-col gap-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check
                      size={16}
                      weight="bold"
                      className="mt-0.5 shrink-0 text-primary"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-7">
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  render={<Link href="/register" />}
                >
                  {plan.cta}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

