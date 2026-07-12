"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Sparkle, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Category } from "@/db/schema";
import { compressReceiptImage } from "@/lib/compress-image";
import type { ReviewItem } from "./receipt-review-dialog";

export type OcrResponse = {
  storeName: string;
  total: number;
  date: string;
  category: Category;
  items: ReviewItem[];
};

export function ReceiptScanDialog({
  open,
  onOpenChange,
  onResult,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dipanggil dengan hasil OCR mentah untuk direview pengguna. */
  onResult: (result: OcrResponse) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async (f: File): Promise<OcrResponse> => {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? "Gagal membaca struk");
      }
      return body;
    },
    onSuccess: (data) => {
      onResult(data);
      handleOpenChange(false);
      toast.success("Struk terbaca. Periksa lalu simpan.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    const compressed = await compressReceiptImage(f);
    setFile(compressed);
    setPreview(URL.createObjectURL(compressed));
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setFile(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera size={18} className="text-primary" />
            Scan Struk
          </DialogTitle>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {preview ? (
          <div className="flex flex-col gap-4">
            <div className="relative h-64 overflow-hidden rounded-xl border border-border/60">
              <Image
                src={preview}
                alt="Preview struk"
                fill
                unoptimized
                className="object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => inputRef.current?.click()}
                disabled={mutation.isPending}
              >
                Ganti Foto
              </Button>
              <Button
                className="flex-1 gap-1.5"
                onClick={() => file && mutation.mutate(file)}
                disabled={mutation.isPending}
              >
                <Sparkle size={16} weight="fill" />
                {mutation.isPending ? "Membaca..." : "Baca dengan AI"}
              </Button>
            </div>
            {mutation.isPending && (
              <p className="text-center text-xs text-muted-foreground">
                AI sedang membaca nama toko, total, dan tanggal...
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border px-6 py-12 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadSimple size={24} />
            </span>
            <span className="text-sm font-medium">
              Pilih atau foto struk belanja
            </span>
            <span className="text-xs text-muted-foreground">
              JPG, PNG, WebP, atau HEIC. Maksimal 8MB.
            </span>
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
