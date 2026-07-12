import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="flex flex-col items-center text-center">
          <h2 className="max-w-md text-3xl font-semibold tracking-tighter md:text-4xl">
            Uangmu, akhirnya jelas ke mana perginya.
          </h2>
          <div className="mt-7">
            <Button size="lg" render={<Link href="/register" />}>
              Mulai Gratis
            </Button>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              R
            </span>
            <span className="text-sm font-medium">Receiption</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Receiption. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}
