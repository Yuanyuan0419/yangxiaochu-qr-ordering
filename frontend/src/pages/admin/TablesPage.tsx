import { useState } from "react";
import { Eraser, LayoutGrid, MoreVertical, Pencil, Plus, Power, QrCode, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckoutButton } from "@/features/admin/CheckoutButton";
import { ClearTableDialog } from "@/features/admin/ClearTableDialog";
import { useTableMutations, useTables } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { DiningTable, TableWithBill } from "@/types";
import { duration, formatPrice } from "@/utils/format";

export default function TablesPage() {
  const { t } = useT();
  const tables = useTables();
  const m = useTableMutations();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<DiningTable | "new" | null>(null);
  const [deleting, setDeleting] = useState<DiningTable | null>(null);
  const [clearing, setClearing] = useState<TableWithBill | null>(null);
  useDocumentTitle(t("a.tables.title"));

  const list = tables.data ?? [];
  const seated = list.filter((x) => x.bill).length;
  const label = (x: DiningTable) => t("common.tableN", { n: x.tableNumber });

  async function toggle(x: DiningTable) {
    try {
      await m.update.mutateAsync({ id: x.id, isActive: !x.isActive });
      toast.success(t(x.isActive ? "a.tables.disabledToast" : "a.tables.enabledToast", { table: label(x) }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("a.orders.updateFailed"));
    }
  }

  return (
    <>
      <PageHeader
        title={t("a.tables.title")}
        subtitle={tables.data ? t("a.tables.subtitle", { seated, total: list.length }) : undefined}
        actions={
          <Button size="sm" className="h-10" onClick={() => setEditing("new")}>
            <Plus /> {t("common.add")}
          </Button>
        }
      />
      <div className="px-4 sm:px-6">
        {tables.isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title={t("a.tables.empty")}
            description={t("a.tables.emptyText")}
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus /> {t("a.tables.addTitle")}
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {list.map((x) => (
              <TableCard
                key={x.id}
                table={x}
                onOpen={() => navigate(`/admin/tables/${x.id}`)}
                menu={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="relative z-10 -mr-1 -mt-1" aria-label={`${label(x)} · ${t("common.more")}`}>
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/admin/tables/${x.id}/qr`}>
                          <QrCode /> {t("a.tables.qr")}
                        </Link>
                      </DropdownMenuItem>
                      {x.bill && (
                        <DropdownMenuItem onSelect={() => setClearing(x)}>
                          <Eraser /> {t("a.clear.action")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => setEditing(x)}>
                        <Pencil /> {t("a.tables.rename")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => toggle(x)}>
                        <Power /> {x.isActive ? t("a.tables.disable") : t("a.tables.enable")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setDeleting(x)}>
                        <Trash2 /> {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
            ))}
          </ul>
        )}
      </div>

      <TableDialog value={editing} existing={list} onClose={() => setEditing(null)} />

      {clearing?.bill && (
        <ClearTableDialog
          open
          onOpenChange={(o) => !o && setClearing(null)}
          bill={{
            id: clearing.bill.id,
            tableNumber: clearing.tableNumber,
            totalAmount: clearing.bill.totalAmount,
            orderCount: clearing.bill.orderCount,
            itemCount: clearing.bill.itemCount,
            pendingCount: clearing.bill.pendingCount,
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleting && t("a.tables.deleteTitle", { table: label(deleting) })}</AlertDialogTitle>
            <AlertDialogDescription>{t("a.tables.deleteText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              destructive
              onClick={() =>
                deleting &&
                m.remove.mutate(deleting.id, { onSuccess: () => toast.success(t("common.deleted")), onError: (err) => toast.error(err.message) })
              }
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TableCard({ table: x, onOpen, menu }: { table: TableWithBill; onOpen: () => void; menu: React.ReactNode }) {
  const { t } = useT();
  const bill = x.bill;
  return (
    <li
      className={cn(
        "relative flex min-h-36 flex-col rounded-2xl p-3 shadow-soft ring-1 transition-colors",
        bill ? "bg-foreground text-background ring-foreground" : "bg-card ring-border/60",
        !x.isActive && "opacity-60",
        bill?.pendingCount && "ring-2 ring-primary",
      )}
    >
      <div className="flex items-start justify-between">
        <button type="button" onClick={onOpen} className="text-left after:absolute after:inset-0 after:rounded-2xl after:content-['']">
          <span className="block text-xs opacity-60">{t("common.table")}</span>
          <span className="tabular block text-3xl font-bold leading-tight">{x.tableNumber}</span>
        </button>
        {menu}
      </div>
      <div className="mt-auto pt-3">
        {bill ? (
          <>
            <p className="tabular text-xl font-bold">{formatPrice(bill.totalAmount)}</p>
            <p className="tabular text-xs opacity-70">
              {duration(bill.openedAt)} · {t("common.orders", { count: bill.orderCount })}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {bill.waitingItems === 0 && bill.pendingCount === 0 && (
                <span className="rounded-full bg-success px-2 py-0.5 text-[11px] font-bold text-white">{t("a.bill.allServed")}</span>
              )}
              {bill.pendingCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                  {t("a.tables.newOrders", { count: bill.pendingCount })}
                </span>
              )}
              {bill.newGuestsHint && (
                <span className="rounded-full bg-warning px-2 py-0.5 text-[11px] font-bold text-white">{t("a.newGuests.short")}</span>
              )}
              {bill.waitingItems > 0 && (
                <span className="rounded-full bg-background/15 px-2 py-0.5 text-[11px] font-semibold">
                  {t("a.tables.toServe", { count: bill.waitingItems })}
                </span>
              )}
            </div>
            <CheckoutButton table={x} className="mt-3 h-11 px-2 text-[13px]" />
          </>
        ) : (
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", x.isActive ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
            {x.isActive ? t("a.tables.free") : t("a.tables.inactive")}
          </span>
        )}
      </div>
    </li>
  );
}

function suggestNext(tables: DiningTable[]) {
  const nums = tables.map((x) => Number(x.tableNumber)).filter((n) => Number.isInteger(n));
  return String(nums.length ? Math.max(...nums) + 1 : 1);
}

function TableDialog({ value, existing, onClose }: { value: DiningTable | "new" | null; existing: DiningTable[]; onClose: () => void }) {
  const { t } = useT();
  const m = useTableMutations();
  const [tableNumber, setTableNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastValue, setLastValue] = useState(value);
  const isNew = value === "new";

  if (value !== lastValue) {
    setLastValue(value);
    setTableNumber(value === "new" ? suggestNext(existing) : (value?.tableNumber ?? ""));
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = tableNumber.trim();
    if (!n) return setError(t("a.tables.number"));
    try {
      if (isNew) await m.create.mutateAsync({ tableNumber: n });
      else if (value) await m.update.mutateAsync({ id: value.id, tableNumber: n });
      toast.success(isNew ? t("a.tables.created", { table: t("common.tableN", { n }) }) : t("common.saved"));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{isNew ? t("a.tables.addTitle") : t("a.tables.editTitle")}</DialogTitle>
            <DialogDescription>{isNew ? t("a.tables.addHint") : t("a.tables.editHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="table-number">
              {t("a.tables.number")}
              <span className="text-primary">*</span>
            </Label>
            <Input
              id="table-number"
              value={tableNumber}
              onChange={(e) => (setTableNumber(e.target.value), setError(null))}
              placeholder={t("a.tables.numberPlaceholder")}
              maxLength={20}
              aria-invalid={!!error}
              autoFocus
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" size="lg" loading={m.create.isPending || m.update.isPending} loadingText={isNew ? t("a.tables.creating") : t("common.saving")}>
              {isNew ? t("common.create") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
