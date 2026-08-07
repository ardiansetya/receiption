"use client";

import { useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ME } from "@/lib/split";

export type Person = { id: string; name: string };

/** Inisial untuk chip peserta; "Budi Santoso" jadi "BS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function ParticipantEditor({
  people,
  onChange,
}: {
  people: Person[];
  onChange: (next: Person[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    onChange([...people, { id: crypto.randomUUID(), name }]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary">
          Saya
        </span>
        {people.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted py-1 pl-1 pr-1.5 text-sm"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-background text-[10px] font-semibold">
              {initials(p.name)}
            </span>
            {p.name}
            <button
              type="button"
              onClick={() => onChange(people.filter((x) => x.id !== p.id))}
              className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Hapus ${p.name}`}
            >
              <X size={12} weight="bold" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={draft}
          maxLength={60}
          placeholder="Nama teman"
          aria-label="Nama peserta baru"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          aria-label="Tambah peserta"
        >
          <Plus size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}

/** Deret tombol toggle: siapa saja yang menanggung satu item. */
export function AssigneeToggles({
  people,
  value,
  onChange,
  label,
}: {
  people: Person[];
  value: string[];
  onChange: (next: string[]) => void;
  label: string;
}) {
  const all: Person[] = [{ id: ME, name: "Saya" }, ...people];

  const toggle = (id: string) => {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id]
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label={label}>
      {all.map((p) => {
        const active = value.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            aria-pressed={active}
            title={p.name}
            className={cn(
              "flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="font-semibold">
              {p.id === ME ? "Saya" : initials(p.name)}
            </span>
          </button>
        );
      })}
      {all.length > 1 && (
        <button
          type="button"
          onClick={() =>
            onChange(value.length === all.length ? [] : all.map((p) => p.id))
          }
          className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {value.length === all.length ? "kosongkan" : "semua"}
        </button>
      )}
    </div>
  );
}
