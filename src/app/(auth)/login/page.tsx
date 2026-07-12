"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GoogleButton } from "@/components/auth/google-button";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      toast.error(
        error.status === 401
          ? "Email atau password salah."
          : "Gagal masuk. Coba lagi."
      );
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-7">
      <h1 className="text-xl font-semibold tracking-tight">Masuk</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Lanjutkan mengelola keuanganmu.
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
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Lupa password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Memproses..." : "Masuk"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">atau</span>
        <Separator className="flex-1" />
      </div>

      <GoogleButton label="Masuk dengan Google" />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Daftar
        </Link>
      </p>
    </div>
  );
}
