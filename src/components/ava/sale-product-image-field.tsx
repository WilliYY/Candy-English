"use client";

import { Crop, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 8 * 1024 * 1024;

export function SaleProductImageField({
  compact = false,
  currentImageUrl = null,
  disabled = false,
  inputId,
}: {
  compact?: boolean;
  currentImageUrl?: string | null;
  disabled?: boolean;
  inputId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl);
  const [removeImage, setRemoveImage] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function clearObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function handleImageChange(file: File | undefined) {
    setMessage(null);

    if (!file) {
      clearObjectUrl();
      setPreviewUrl(removeImage ? null : currentImageUrl);
      return;
    }

    if (!acceptedImageTypes.has(file.type)) {
      if (inputRef.current) inputRef.current.value = "";
      setMessage("Escolha uma foto PNG, JPG ou WebP.");
      return;
    }

    if (file.size <= 0 || file.size > maxImageBytes) {
      if (inputRef.current) inputRef.current.value = "";
      setMessage("A foto precisa ter ate 8 MB.");
      return;
    }

    clearObjectUrl();
    objectUrlRef.current = URL.createObjectURL(file);
    setPreviewUrl(objectUrlRef.current);
    setRemoveImage(false);
  }

  function removePreview() {
    clearObjectUrl();
    if (inputRef.current) inputRef.current.value = "";
    setPreviewUrl(null);
    setRemoveImage(Boolean(currentImageUrl));
    setMessage(
      currentImageUrl
        ? "A foto atual sera removida quando salvar."
        : "Foto retirada do cadastro.",
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3 rounded-lg border border-cyan-200 bg-cyan-50/55 p-3",
        compact ? "sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center" : "sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-md border-2 border-dashed border-cyan-600 bg-white shadow-inner">
        {previewUrl ? (
          // A rota da imagem exige a sessao do AVA; por isso usamos o carregamento direto do navegador.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt="Previa do recorte do produto"
            className="size-full object-cover object-center"
            src={previewUrl}
          />
        ) : (
          <span className="grid size-full place-items-center text-center text-xs font-bold text-cyan-900/55">
            <span>
              <ImagePlus aria-hidden="true" className="mx-auto mb-1.5 size-6" />
              Sem foto
            </span>
          </span>
        )}
        <span aria-hidden="true" className="pointer-events-none absolute inset-2 rounded border border-white/90 shadow-[0_0_0_1px_rgba(8,145,178,0.55)]" />
        <span className="absolute bottom-2 left-2 rounded bg-cyan-950/85 px-1.5 py-0.5 text-[0.58rem] font-extrabold uppercase text-white">
          Area salva 4:3
        </span>
      </div>

      <div className="grid min-w-0 gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary">
            <Crop aria-hidden="true" className="size-3.5 text-cyan-700" />
            Foto do produto
          </span>
          <p className="mt-1 text-[0.68rem] leading-4 text-muted-foreground">
            A foto centraliza e recorta dentro da linha. O arquivo final e salvo em WebP.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <label
            className={cn(
              "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-cyan-300 bg-white px-3 text-xs font-bold text-cyan-900 transition hover:border-cyan-500 hover:bg-cyan-50",
              disabled && "pointer-events-none opacity-50",
            )}
            htmlFor={inputId}
          >
            <ImagePlus aria-hidden="true" className="size-3.5" />
            {previewUrl ? "Trocar foto" : "Escolher foto"}
          </label>
          <input
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={disabled}
            id={inputId}
            name="image"
            onChange={(event) => handleImageChange(event.target.files?.[0])}
            ref={inputRef}
            type="file"
          />
          {previewUrl ? (
            <Button
              disabled={disabled}
              onClick={removePreview}
              size="sm"
              type="button"
              variant="outline"
            >
              <Trash2 aria-hidden="true" />
              Remover
            </Button>
          ) : null}
        </div>

        <input name="removeImage" type="hidden" value={String(removeImage)} />
        {message ? (
          <p aria-live="polite" className="text-[0.68rem] font-semibold text-cyan-900" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
