import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n";
import { ApiError } from "@/services/api";
import { formatPrice } from "@/utils/format";
import type { CheckoutBill } from "./BillView";
import { useClearBill, useSession } from "./queries";

/**
 * Clear a table without payment. Protected by the owner's login password (verified on the server
 * against the same hash used for sign-in, so changing the login password changes this too).
 */
export function ClearTableDialog({ bill, open, onOpenChange }: { bill: CheckoutBill; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useT();
  const { data: session } = useSession();
  const clear = useClearBill();
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const table = t("common.tableN", { n: bill.tableNumber });

  function close(o: boolean) {
    if (!o) {
      setPassword("");
      setNote("");
      setError(null);
    }
    onOpenChange(o);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    try {
      await clear.mutateAsync({ id: bill.id, password, note: note.trim() || null });
      toast.success(t("a.clear.done", { table }));
      close(false);
    } catch (err) {
      setPassword("");
      setError(err instanceof ApiError ? err.message : t("common.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t("a.clear.title", { table })}</DialogTitle>
            <DialogDescription>{t("a.clear.text")}</DialogDescription>
          </DialogHeader>
          {Number(bill.totalAmount) > 0 && (
            <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm font-medium text-warning">
              {t("a.clear.amount", { total: formatPrice(bill.totalAmount) })}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="clear-note">{t("a.clear.reason")}</Label>
            <Input id="clear-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} placeholder={t("a.clear.reasonPlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clear-password" className="flex items-center gap-1.5">
              <Lock className="size-3.5" aria-hidden /> {t("a.clear.password")}
            </Label>
            {/* Lets password managers fill the right account. */}
            <input type="text" name="username" autoComplete="username" value={session?.user.email ?? ""} readOnly hidden />
            <div className="relative">
              <Input
                id="clear-password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                aria-invalid={!!error}
                aria-describedby="clear-password-hint"
                className="pr-12"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label={show ? t("a.login.hide") : t("a.login.show")}
                aria-pressed={show}
              >
                {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            <p id="clear-password-hint" className="text-xs text-muted-foreground">
              {t("a.clear.passwordHint")}
            </p>
            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" size="lg" className="w-full" disabled={!password} loading={clear.isPending} loadingText={t("a.clear.clearing")}>
              {t("a.clear.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
