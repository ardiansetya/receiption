"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks } from "./nav-links";
import { AccountMenu } from "./account-menu";
import { cn } from "@/lib/utils";

type AppUser = { name: string; email: string };

export function Sidebar({ user }: { user: AppUser }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/60 bg-card md:flex">
      <Link href="/dashboard" className="flex h-16 items-center gap-2 px-5">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          R
        </span>
        <span className="font-semibold tracking-tight">Receiption</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navLinks.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <link.icon size={18} weight={active ? "fill" : "regular"} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-3">
        <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-2">
          <span className="truncate text-sm font-medium">{user.name}</span>
          <AccountMenu user={user} />
        </div>
      </div>
    </aside>
  );
}

export function MobileHeader({ user }: { user: AppUser }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur-md md:hidden">
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          R
        </span>
        <span className="font-semibold tracking-tight">Receiption</span>
      </Link>
      <AccountMenu user={user} />
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-card/95 backdrop-blur-md md:hidden">
      <div className="grid grid-cols-5">
        {navLinks.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <link.icon size={20} weight={active ? "fill" : "regular"} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
