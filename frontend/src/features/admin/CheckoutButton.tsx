import { useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { TableWithBill } from "@/types";
import { formatPrice } from "@/utils/format";
import { CheckoutDialog } from "./BillView";

/**
 * One-tap "Check out · €49.00" for a seated table. Solid red once every dish is served,
 * so the owner can see at a glance which tables are ready to pay and free up.
 */
export function CheckoutButton({ table, className }: { table: TableWithBill; className?: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const bill = table.bill;
  if (!bill) return null;
  const ready = bill.waitingItems === 0 && bill.pendingCount === 0;

  return (
    <>
      <Button
        type="button"
        size="lg"
        variant={ready ? "default" : "secondary"}
        className={cn("relative z-10 w-full", className)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Wallet /> <span className="tabular">{t("a.bill.checkoutAmount", { total: formatPrice(bill.totalAmount) })}</span>
      </Button>
      <CheckoutDialog
        open={open}
        onOpenChange={setOpen}
        bill={{
          id: bill.id,
          tableNumber: table.tableNumber,
          totalAmount: bill.totalAmount,
          orderCount: bill.orderCount,
          itemCount: bill.itemCount,
          pendingCount: bill.pendingCount,
        }}
      />
    </>
  );
}
