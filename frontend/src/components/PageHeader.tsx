import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

interface Props {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Path to go back to; falls back to history when omitted but `back` is true. */
  back?: string | boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, back, actions, className }: Props) {
  const navigate = useNavigate();
  const { t } = useT();
  return (
    <header className={cn("no-print sticky top-0 z-30 flex min-h-16 items-center gap-1 bg-background/95 px-2 py-2 backdrop-blur sm:px-4", className)}>
      {back && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("common.back")}
          onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
        >
          <ArrowLeft />
        </Button>
      )}
      <div className={cn("min-w-0 flex-1", !back && "pl-2")}>
        <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}
