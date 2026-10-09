import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { useTranslateMenu, useTranslateStatus } from "./queries";

/** Shown when DeepL is configured and some EN/FR fields are empty: fills them all in one tap. */
export function AutoTranslateCard({ className }: { className?: string }) {
  const { t } = useT();
  const status = useTranslateStatus();
  const run = useTranslateMenu();
  if (!status.data?.enabled || !status.data.missing) return null;

  return (
    <section className={`flex items-center gap-3 rounded-2xl bg-info-soft p-4 ${className ?? ""}`}>
      <Sparkles className="size-5 shrink-0 text-info" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-info">{t("a.tr.bulkTitle", { count: status.data.missing })}</p>
        <p className="text-xs text-muted-foreground">{t("a.tr.bulkText")}</p>
      </div>
      <Button
        size="sm"
        className="shrink-0"
        loading={run.isPending}
        loadingText={t("a.tr.translating")}
        onClick={() =>
          run.mutate(undefined, {
            onSuccess: (r) => toast.success(t("a.tr.bulkDone", { count: r.fields })),
            onError: (err) => toast.error(err.message),
          })
        }
      >
        {t("a.tr.bulkButton")}
      </Button>
    </section>
  );
}
