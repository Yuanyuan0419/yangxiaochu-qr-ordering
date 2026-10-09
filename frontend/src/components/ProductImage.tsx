import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Eager-load images likely to be above the fold. */
  priority?: boolean;
}

/** Fixed-ratio image with shimmer while loading and a neutral placeholder when missing or broken. */
export function ProductImage({ src, alt, className, priority }: Props) {
  const { t } = useT();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {showImage ? (
        <>
          {!loaded && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />}
          <img
            src={src}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn("size-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
          />
        </>
      ) : (
        <div className="grid size-full place-items-center bg-gradient-to-br from-secondary to-muted text-muted-foreground/50">
          <UtensilsCrossed className="size-1/3 max-h-10 max-w-10" aria-hidden />
          <span className="sr-only">
            {alt} ({t("common.noImage")})
          </span>
        </div>
      )}
    </div>
  );
}
