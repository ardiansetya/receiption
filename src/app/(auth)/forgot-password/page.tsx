"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setLoading(false);
    if (error) {
      toast.error("Gagal mengirim link reset. Coba lagi.");
      return;
    }
    setSent(true);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-7">
      <h1 className="text-xl font-semibold tracking-tight">Lupa Password</h1>

      {sent ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Jika email <span className="font-medium text-foreground">{email}</span>{" "}
          terdaftar, link reset password sudah dikirim. Periksa inbox dan folder
          spam.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Masukkan email, kami kirim link untuk reset password.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim Link Reset"}
            </Button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          Kembali ke halaman masuk
        </Link>
      </p>
    </div>
  );
}
