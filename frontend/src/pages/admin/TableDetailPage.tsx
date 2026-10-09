import { useState } from "react";
import { Eraser, Printer, QrCode, ReceiptText, Wallet } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BillView, CheckoutDialog } from "@/features/admin/BillView";
import { ClearTableDialog } from "@/features/admin/ClearTableDialog";
import { useTable } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

/** A table's current visit: running bill, serving progress and checkout. */
export default function TableDetailPage() {
  const id = Number(useParams().id);
  const { t } = useT();
  const data = useTable(id);
  const [checkout, setCheckout] = useState(false);
  const [clearing, setClearing] = useState(false);
  const table = data.data?.table;
  const bill = data.data?.session;
  const title = table ? t("common.tableN", { n: table.tableNumber }) : "…";
  useDocumentTitle(title);

  return (
    <div className="pb-32">
      <PageHeader
        title={title}
        subtitle={bill ? t("a.tables.seated") : table ? (table.isActive ? t("a.bill.free") : t("a.tables.inactive")) : undefined}
        back="/admin/tables"
        actions={
          table && (
            <>
              {bill && (
                <Button variant="ghost" size="icon" aria-label={t("a.bill.print")} onClick={() => window.print()}>
                  <Printer />
                </Button>
              )}
              <Button variant="ghost" size="icon" asChild>
                <Link to={`/admin/tables/${id}/qr`} aria-label={t("a.tables.qr")}>
                  <QrCode />
                </Link>
              </Button>
            </>
          )
        }
      />
      <div className="px-4 sm:px-6">
        {data.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : data.isError ? (
          <p className="py-16 text-center text-muted-foreground">{data.error.message}</p>
        ) : bill ? (
          <BillView bill={bill} />
        ) : (
          <EmptyState
            icon={ReceiptText}
            title={t("a.bill.free")}
            description={t("a.bill.freeText")}
            action={
              <Button variant="outline" asChild>
                <Link to={`/admin/tables/${id}/qr`}>
                  <QrCode /> {t("a.tables.qr")}
                </Link>
              </Button>
            }
          />
        )}
      </div>

      {bill && (
        <>
          <div className="no-print fixed inset-x-0 bottom-16 z-30 border-t bg-card/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
            <div className="mx-auto flex max-w-3xl gap-3">
              <Button size="xl" variant="outline" onClick={() => setClearing(true)}>
                <Eraser /> {t("a.clear.action")}
              </Button>
              <Button size="xl" className="flex-1" onClick={() => setCheckout(true)}>
                <Wallet /> {t("a.bill.checkout")}
              </Button>
            </div>
          </div>
          <CheckoutDialog bill={bill} open={checkout} onOpenChange={setCheckout} />
          <ClearTableDialog bill={bill} open={clearing} onOpenChange={setClearing} />
        </>
      )}
    </div>
  );
}
