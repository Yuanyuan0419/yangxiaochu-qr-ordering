import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

export function useQrDataUrl(text: string, width = 1024) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(text, { width, margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1714", light: "#ffffff" } })
      .then((u) => !cancelled && setUrl(u))
      .catch(() => !cancelled && setUrl(null));
    return () => {
      cancelled = true;
    };
  }, [text, width]);
  return url;
}

export function QrImage({ text, alt, className, width }: { text: string; alt: string; className?: string; width?: number }) {
  const url = useQrDataUrl(text, width);
  return url ? (
    <img src={url} alt={alt} className={cn("aspect-square bg-white", className)} />
  ) : (
    <div className={cn("aspect-square animate-pulse rounded-lg bg-muted", className)} aria-hidden />
  );
}
