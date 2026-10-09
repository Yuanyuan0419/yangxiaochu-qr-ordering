import { RefreshCw, ScanLine, WifiOff } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n";
import { ApiError } from "@/services/api";

export function MenuSkeleton() {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-lg px-4 pt-6" aria-busy aria-label={t("c.loadingMenu")}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-14 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-16 rounded-full" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-2xl bg-card p-3">
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-4 h-5 w-16" />
            </div>
            <Skeleton className="size-[104px] rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MenuError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useT();
  const notFound = error instanceof ApiError && error.status === 404;
  const Icon = notFound ? ScanLine : WifiOff;
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
      <LanguageSwitcher className="absolute right-4 top-4" />
      <div className="mb-5 grid size-20 place-items-center rounded-[28px] bg-primary-soft text-primary">
        <Icon className="size-9" aria-hidden />
      </div>
      <h1 className="text-xl font-bold">{notFound ? t("c.menuError.invalidTitle") : t("c.menuError.loadTitle")}</h1>
      <p className="mt-2 text-muted-foreground">
        {error instanceof Error ? error.message : null}
        {notFound && (
          <>
            <br />
            {t("c.menuError.rescan")}
          </>
        )}
      </p>
      {!notFound && (
        <Button className="mt-6" onClick={onRetry}>
          <RefreshCw /> {t("common.retry")}
        </Button>
      )}
    </div>
  );
}
