import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

interface Props {
  value: string | null;
  /** Uploads the file and returns the stored URL (or throws). */
  onUpload: (file: File) => Promise<unknown>;
  onRemove?: () => void | Promise<unknown>;
  aspect?: "4/3" | "square";
  label: string;
  emptyHint?: string;
}

/**
 * Phone-friendly image picker: one button opens the photo library (iOS/Android also offer the camera there),
 * a second one opens the camera directly. Validates type and size before uploading.
 */
export function ImageUploader({ value, onUpload, onRemove, aspect = "4/3", label, emptyHint }: Props) {
  const { t } = useT();
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      toast.error(t("a.img.badType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("a.img.tooLarge"));
      return;
    }
    const local = URL.createObjectURL(file);
    setPreview(local);
    setBusy("upload");
    try {
      await onUpload(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("a.img.failed"));
    } finally {
      setBusy(null);
      setPreview(null);
      URL.revokeObjectURL(local);
    }
  }

  async function handleRemove() {
    if (!onRemove) return;
    setBusy("remove");
    try {
      await onRemove();
    } finally {
      setBusy(null);
    }
  }

  const shown = preview ?? value;
  const box = aspect === "square" ? "aspect-square w-36" : "aspect-[4/3] w-full";

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => libraryRef.current?.click()}
        disabled={!!busy}
        className={cn(
          "press relative grid place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-input bg-secondary/50 text-muted-foreground transition-colors hover:border-primary/50",
          box,
          shown && "border-solid border-transparent",
        )}
        aria-label={shown ? t("a.img.change") : t("a.img.upload", { label })}
      >
        {shown ? (
          <img src={shown} alt="" className={cn("size-full", aspect === "square" ? "object-contain bg-card" : "object-cover")} />
        ) : (
          <span className="flex flex-col items-center gap-2 px-4 text-center">
            <ImagePlus className="size-8" aria-hidden />
            <span className="text-sm font-medium">{emptyHint ?? t("a.img.upload", { label })}</span>
            <span className="text-xs">{t("a.img.formats")}</span>
          </span>
        )}
        {busy === "upload" && (
          <span className="absolute inset-0 grid place-items-center bg-black/40 text-white">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Loader2 className="size-5 animate-spin" aria-hidden /> {t("a.img.uploading")}
            </span>
          </span>
        )}
      </button>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => libraryRef.current?.click()} disabled={!!busy}>
          <ImagePlus /> {shown ? t("a.img.change") : t("a.img.library")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()} disabled={!!busy}>
          <Camera /> {t("a.img.camera")}
        </Button>
        {value && onRemove && (
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={handleRemove} loading={busy === "remove"}>
            <Trash2 /> {t("a.img.remove")}
          </Button>
        )}
      </div>

      <input ref={libraryRef} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={cameraRef} type="file" accept={ACCEPT} capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
