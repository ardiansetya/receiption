"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const invalid = searchParams.get("error") === "INVALID_TOKEN" || !token;

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);
    if (error) {
      toast.error("Gagal reset password. Link mungkin kedaluwarsa.");
      return;
    }
    toast.success("Password berhasil diubah. Silakan masuk.");
    router.push("/login");
  };

  if (invalid) {
    return (
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Link reset tidak valid atau sudah kedaluwarsa. Minta link baru dari
        halaman{" "}
        <Link href="/forgot-password" className="text-primary hover:underline">
          lupa password
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password baru</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Menyimpan..." : "Simpan Password Baru"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-7">
      <h1 className="text-xl font-semibold tracking-tight">Reset Password</h1>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
