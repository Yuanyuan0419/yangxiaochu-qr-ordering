import { Minus, Plus, Trash2 } from "lucide-react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "lg";
  /** Show a trash icon instead of minus when decrementing would remove the line. */
  removable?: boolean;
  label: string;
}

export function QuantityStepper({ value, onChange, min = 1, max = 50, size = "sm", removable, label }: Props) {
  const { t } = useT();
  const btn = size === "lg" ? "size-12" : "size-10";
  const showTrash = removable && value <= 1;
  return (
    <div className={cn("inline-flex items-center rounded-full bg-secondary p-0.5", size === "lg" && "p-1")} role="group" aria-label={t("c.qtyGroup", { name: label })}>
      <button
        type="button"
        className={cn(btn, "press grid place-items-center rounded-full text-foreground hover:bg-card disabled:opacity-40")}
        onClick={() => onChange(value - 1)}
        disabled={!removable && value <= min}
        aria-label={showTrash ? t("c.remove", { name: label }) : t("c.decrease", { name: label })}
      >
        {showTrash ? <Trash2 className="size-[18px]" /> : <Minus className="size-[18px]" />}
      </button>
      <span className={cn("tabular min-w-8 text-center font-semibold", size === "lg" && "min-w-10 text-lg")} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={cn(btn, "press grid place-items-center rounded-full bg-card text-foreground shadow-sm disabled:opacity-40")}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={t("c.increase", { name: label })}
      >
        <Plus className="size-[18px]" />
      </button>
    </div>
  );
}
