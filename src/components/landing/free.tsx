"use client";

import { motion, useReducedMotion } from "motion/react";
import { Gift, CreditCard, ShieldCheck, CaretDown } from "@phosphor-icons/react";
import { FAQS } from "@/lib/faq";

const ease = [0.16, 1, 0.3, 1] as const;

const perks = [
  { icon: Gift, label: "Semua fitur terbuka" },
  { icon: CreditCard, label: "Tanpa kartu kredit" },
  { icon: ShieldCheck, label: "Data cuma buat kamu" },
];

export function Free() {
  const reduce = useReducedMotion();

  return (
    <section id="gratis" className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto max-w-xl text-center"
        >
          <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
            Semua fitur. Gratis.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Tanpa kartu kredit, tanpa iklan, tanpa paket berbayar. Cukup daftar
            dan mulai mencatat.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-x-8 gap-y-3 text-sm sm:flex-row">
            {perks.map((perk) => (
              <span
                key={perk.label}
                className="flex items-center gap-2 text-foreground/80"
              >
                <perk.icon size={18} weight="bold" className="text-primary" />
                {perk.label}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="mx-auto mt-14 flex max-w-3xl flex-col gap-3"
        >
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-2xl border border-border/60 bg-card px-6 transition-colors open:border-primary/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium [&::-webkit-details-marker]:hidden">
                {faq.q}
                <CaretDown
                  size={18}
                  className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="-mt-1 pb-5 text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </p>
            </details>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
