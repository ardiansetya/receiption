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

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password minimal 8 karakter.");
      return;
    }
    setLoading(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) {
      toast.error(
        error.status === 422
          ? "Email sudah terdaftar."
          : "Gagal mendaftar. Coba lagi."
      );
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-7">
      <h1 className="text-xl font-semibold tracking-tight">Daftar</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gratis, tanpa kartu kredit.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nama</Label>
          <Input
            id="name"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
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
          <Label htmlFor="password">Password</Label>
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
          {loading ? "Memproses..." : "Buat Akun"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">atau</span>
        <Separator className="flex-1" />
      </div>

      <GoogleButton label="Daftar dengan Google" />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
