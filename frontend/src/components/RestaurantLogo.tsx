import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  logoUrl: string | null | undefined;
  className?: string;
}

/** Restaurant logo from the API; falls back to a monogram of the restaurant's first character. */
export function RestaurantLogo({ name, logoUrl, className }: Props) {
  const [failed, setFailed] = useState(false);
  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        onError={() => setFailed(true)}
        className={cn("size-12 shrink-0 rounded-2xl bg-card object-contain ring-1 ring-border", className)}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn("grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground", className)}
    >
      {Array.from(name.trim())[0] ?? "?"}
    </div>
  );
}
