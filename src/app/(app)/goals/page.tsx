"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  PiggyBank,
  Trash,
  PencilSimple,
  CheckCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateID, formatIDR } from "@/lib/format";

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string | null;
};

type GoalDraft = {
  id?: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
};

const emptyDraft = (): GoalDraft => ({
  name: "",
  targetAmount: 0,
  savedAmount: 0,
  deadline: "",
});

async function fetchGoals(): Promise<{ items: Goal[] }> {
  const res = await fetch("/api/goals");
  if (!res.ok) throw new Error("Gagal memuat target");
  return res.json();
}

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<GoalDraft>(emptyDraft());
  const [deleting, setDeleting] = useState<Goal | null>(null);
  const [funding, setFunding] = useState<Goal | null>(null);
  const [fundAmount, setFundAmount] = useState(0);

  const { data, isPending } = useQuery({
    queryKey: ["goals"],
    queryFn: fetchGoals,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["goals"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (g: GoalDraft) => {
      const res = await fetch(g.id ? `/api/goals/${g.id}` : "/api/goals", {
        method: g.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: g.name,
          targetAmount: g.targetAmount,
          savedAmount: g.savedAmount,
          deadline: g.deadline || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan target");
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Target disimpan.");
      setFormOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const fundMutation = useMutation({
    mutationFn: async ({ goal, amount }: { goal: Goal; amount: number }) => {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savedAmount: goal.savedAmount + amount }),
      });
      if (!res.ok) throw new Error("Gagal menambah dana");
    },
    onSuccess: () => {
      invalidate();
      toast.success("Dana ditambahkan.");
      setFunding(null);
      setFundAmount(0);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus target");
    },
    onSuccess: () => {
      invalidate();
      toast.success("Target dihapus.");
      setDeleting(null);
    },
    onError: () => toast.error("Gagal menghapus target."),
  });

  const openCreate = () => {
    setDraft(emptyDraft());
    setFormOpen(true);
  };

  const openEdit = (g: Goal) => {
    setDraft({
      id: g.id,
      name: g.name,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount,
      deadline: g.deadline ?? "",
    });
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.targetAmount <= 0) {
      toast.error("Target harus lebih dari 0.");
      return;
    }
    saveMutation.mutate(draft);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Target Tabungan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tujuan finansial yang sedang kamu kejar
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus size={16} weight="bold" />
          Buat Target
        </Button>
      </div>

      <div className="mt-6">
        {isPending ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <PiggyBank size={24} />
              </span>
              <p className="max-w-72 text-sm text-muted-foreground">
                Belum ada target. Mulai dari yang kamu inginkan, misalnya
                &ldquo;Beli Laptop&rdquo; Rp15.000.000.
              </p>
              <Button size="sm" onClick={openCreate}>
                Buat Target
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.items.map((g) => {
              const pct =
                g.targetAmount > 0
                  ? Math.min((g.savedAmount / g.targetAmount) * 100, 100)
                  : 0;
              const done = g.savedAmount >= g.targetAmount;
              return (
                <div
                  key={g.id}
                  className="group flex flex-col rounded-xl border border-border/60 bg-card p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="flex items-center gap-1.5 font-medium">
                        {g.name}
                        {done && (
                          <CheckCircle
                            size={16}
                            weight="fill"
                            className="text-primary"
                          />
                        )}
                      </p>
                      {g.deadline && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Deadline {formatDateID(g.deadline)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEdit(g)}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Edit target"
                      >
                        <PencilSimple size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(g)}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Hapus target"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between text-sm">
                    <span className="font-mono font-medium">
                      {formatIDR(g.savedAmount)}
                    </span>
                    <span className="text-muted-foreground">
                      dari {formatIDR(g.targetAmount)}
                    </span>
                  </div>
                  <Progress value={pct} className="mt-2 h-2" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {done
                      ? "Target tercapai!"
                      : `${pct.toFixed(0)}% · kurang ${formatIDR(g.targetAmount - g.savedAmount)}`}
                  </p>

                  {!done && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => {
                        setFunding(g);
                        setFundAmount(0);
                      }}
                    >
                      Tambah Dana
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form buat/edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Target" : "Buat Target"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-name">Nama target</Label>
              <Input
                id="goal-name"
                required
                maxLength={120}
                placeholder="Beli Laptop"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="goal-target">Target (Rp)</Label>
                <Input
                  id="goal-target"
                  type="number"
                  required
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={draft.targetAmount || ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      targetAmount: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="goal-saved">Terkumpul (Rp)</Label>
                <Input
                  id="goal-saved"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={draft.savedAmount || ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      savedAmount: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-deadline">Deadline (opsional)</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={draft.deadline}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, deadline: e.target.value }))
                }
              />
            </div>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Target"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tambah dana */}
      <Dialog
        open={Boolean(funding)}
        onOpenChange={(open) => !open && setFunding(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah dana ke &ldquo;{funding?.name}&rdquo;</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!funding) return;
              if (fundAmount <= 0) {
                toast.error("Nominal harus lebih dari 0.");
                return;
              }
              fundMutation.mutate({ goal: funding, amount: fundAmount });
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="fund-amount">Nominal (Rp)</Label>
              <Input
                id="fund-amount"
                type="number"
                required
                min={1}
                step={1}
                inputMode="numeric"
                autoFocus
                value={fundAmount || ""}
                onChange={(e) => setFundAmount(Number(e.target.value))}
              />
            </div>
            <Button type="submit" disabled={fundMutation.isPending}>
              {fundMutation.isPending ? "Menyimpan..." : "Tambahkan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hapus */}
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus target?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Target &ldquo;{deleting?.name}&rdquo; akan dihapus permanen.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
