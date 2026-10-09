import { Check, Globe } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LANG_LABEL, LANGS, useLangStore, useT } from "@/i18n";
import { cn } from "@/lib/utils";

/** Compact globe button with the three UI languages. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, lang } = useT();
  const setLang = useLangStore((s) => s.setLang);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("press flex h-10 items-center gap-1.5 rounded-full bg-card px-3 text-sm font-semibold ring-1 ring-border", className)}
        aria-label={t("common.language")}
      >
        <Globe className="size-4" aria-hidden />
        {lang === "zh" ? "中" : lang.toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGS.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => setLang(l)} lang={l}>
            <span className="flex-1">{LANG_LABEL[l]}</span>
            {l === lang && <Check className="!text-primary" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Full-width segmented control, used in settings. */
export function LanguageSegmented() {
  const { lang } = useT();
  const setLang = useLangStore((s) => s.setLang);
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-secondary p-1" role="radiogroup">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={l === lang}
          lang={l}
          onClick={() => setLang(l)}
          className={cn(
            "press h-11 rounded-xl text-[15px] font-semibold transition-colors",
            l === lang ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
