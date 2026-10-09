import { useState } from "react";
import { Printer, Wallet } from "lucide-react";
import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BillView, CheckoutDialog } from "@/features/admin/BillView";
import { useBill } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

export default function BillDetailPage() {
  const id = Number(useParams().id);
  const { t } = useT();
  const bill = useBill(id);
  const [checkout, setCheckout] = useState(false);
  const title = bill.data ? `${t("a.bill.title")} · ${t("common.tableN", { n: bill.data.tableNumber })}` : t("a.bill.title");
  useDocumentTitle(title);

  return (
    <div className="pb-32">
      <PageHeader
        title={title}
        back
        actions={
          <Button variant="ghost" size="icon" aria-label={t("a.bill.print")} onClick={() => window.print()}>
            <Printer />
          </Button>
        }
      />
      <div className="px-4 sm:px-6">
        {bill.isPending ? (
          <Skeleton className="h-64 rounded-3xl" />
        ) : bill.isError ? (
          <p className="py-16 text-center text-muted-foreground">{bill.error.message}</p>
        ) : (
          <BillView bill={bill.data} />
        )}
      </div>
      {bill.data?.status === "OPEN" && (
        <>
          <div className="no-print fixed inset-x-0 bottom-16 z-30 border-t bg-card/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
            <div className="mx-auto max-w-3xl">
              <Button size="xl" className="w-full" onClick={() => setCheckout(true)}>
                <Wallet /> {t("a.bill.checkout")}
              </Button>
            </div>
          </div>
          <CheckoutDialog bill={bill.data} open={checkout} onOpenChange={setCheckout} />
        </>
      )}
    </div>
  );
}
