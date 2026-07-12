import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          R
        </span>
        <span className="text-lg font-semibold tracking-tight">
          Receiption
        </span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
