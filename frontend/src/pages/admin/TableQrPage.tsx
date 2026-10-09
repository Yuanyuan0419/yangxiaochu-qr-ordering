import { AlertTriangle, Copy, Download, ExternalLink, Printer, RefreshCw } from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { useQrDataUrl } from "@/components/QrImage";
import { RestaurantLogo } from "@/components/RestaurantLogo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession, useTable, useTableMutations } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { isLocalOnlyOrigin, menuUrl } from "@/utils/url";

const SCAN_TEXT = "扫码点餐 · Scan to order · Scannez pour commander";

/** Renders a print-ready PNG card: restaurant name, QR and table number (always trilingual). */
async function renderCardPng(qrDataUrl: string, restaurantName: string, tableNumber: string) {
  const W = 1200;
  const H = 1600;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const font = (weight: number, size: number) =>
    `${weight} ${size}px "Plus Jakarta Sans Variable", "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif`;

  ctx.textAlign = "center";
  ctx.fillStyle = "#1c1714";
  ctx.font = font(700, 84);
  ctx.fillText(restaurantName, W / 2, 190);
  ctx.fillStyle = "#6b625b";
  ctx.font = font(500, 40);
  ctx.fillText(SCAN_TEXT, W / 2, 270, W - 120);

  const qr = new Image();
  qr.src = qrDataUrl;
  await qr.decode();
  const size = 820;
  ctx.drawImage(qr, (W - size) / 2, 340, size, size);

  ctx.fillStyle = "#bf3a2b";
  const pillW = 520;
  const pillH = 150;
  const x = (W - pillW) / 2;
  const y = 1250;
  ctx.beginPath();
  ctx.roundRect(x, y, pillW, pillH, 75);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = font(800, 80);
  ctx.fillText(`Table ${tableNumber}`, W / 2, y + 104);

  return canvas.toDataURL("image/png");
}

export default function TableQrPage() {
  const id = Number(useParams().id);
  const { t } = useT();
  const data = useTable(id);
  const table = { ...data, data: data.data?.table };
  const { data: session } = useSession();
  const m = useTableMutations();
  const tableLabel = table.data ? t("common.tableN", { n: table.data.tableNumber }) : "";
  useDocumentTitle(table.data ? t("a.qr.title", { table: tableLabel }) : t("a.tables.qr"));

  const url = table.data && session ? menuUrl(session.restaurant.slug, table.data.qrToken) : "";
  const qr = useQrDataUrl(url || "about:blank", 1024);

  if (data.isPending || !session) {
    return (
      <>
        <PageHeader title={t("a.tables.qr")} back="/admin/tables" />
        <div className="px-4">
          <Skeleton className="mx-auto aspect-[3/4] max-w-sm rounded-3xl" />
        </div>
      </>
    );
  }
  if (data.isError || !table.data) {
    return (
      <>
        <PageHeader title={t("a.tables.qr")} back="/admin/tables" />
        <p className="py-16 text-center text-muted-foreground">{data.error?.message}</p>
      </>
    );
  }

  const tb = table.data;
  const restaurant = session.restaurant;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("a.qr.copied"));
    } catch {
      // Clipboard API needs a secure context; plain http on the LAN falls back to a prompt-free selection.
      const input = document.createElement("textarea");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand("copy");
      input.remove();
      if (ok) toast.success(t("a.qr.copied"));
      else toast.error(t("a.qr.copyFailed"));
    }
  }

  async function download() {
    if (!qr) return;
    try {
      const png = await renderCardPng(qr, restaurant.name, tb.tableNumber);
      const a = document.createElement("a");
      a.href = png;
      a.download = `${restaurant.slug}-table-${tb.tableNumber}-qr.png`;
      a.click();
    } catch {
      toast.error(t("a.qr.imageFailed"));
    }
  }

  return (
    <div className="pb-10">
      <PageHeader
        title={t("a.qr.title", { table: tableLabel })}
        subtitle={tb.isActive ? t("a.qr.subtitleActive") : t("a.qr.subtitleInactive")}
        back={`/admin/tables/${id}`}
      />

      <div className="px-4 sm:px-6">
        {isLocalOnlyOrigin() && (
          <div role="alert" className="no-print mb-4 flex gap-3 rounded-2xl bg-warning-soft p-4 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p>{t("a.qr.localhostWarn")}</p>
          </div>
        )}

        {/* Printable card */}
        <div id="qr-print" className="mx-auto max-w-sm rounded-3xl bg-white p-8 text-center text-[#1c1714] shadow-lift ring-1 ring-border print:max-w-none print:shadow-none print:ring-0">
          <div className="flex items-center justify-center gap-3">
            <RestaurantLogo name={restaurant.name} logoUrl={restaurant.logoUrl} className="size-10 rounded-xl text-base" />
            <p className="text-2xl font-bold">{restaurant.name}</p>
          </div>
          {restaurant.nameEn && <p className="text-sm font-medium text-[#6b625b]">{restaurant.nameEn}</p>}
          <p className="mt-1 text-xs text-[#6b625b]">{SCAN_TEXT}</p>
          {qr ? <img src={qr} alt={t("a.qr.alt", { table: tableLabel })} className="mx-auto mt-5 w-full max-w-[280px]" /> : <Skeleton className="mx-auto mt-5 aspect-square max-w-[280px]" />}
          <p className="mx-auto mt-5 inline-block rounded-full bg-primary px-6 py-2 text-2xl font-extrabold text-white">Table {tb.tableNumber}</p>
        </div>

        <p className="no-print mx-auto mt-4 max-w-sm break-all text-center font-mono text-xs text-muted-foreground">{url}</p>

        <div className="no-print mx-auto mt-5 grid max-w-sm grid-cols-2 gap-2">
          <Button variant="default" size="lg" onClick={download} disabled={!qr}>
            <Download /> {t("a.qr.download")}
          </Button>
          <Button variant="outline" size="lg" onClick={() => window.print()}>
            <Printer /> {t("a.qr.print")}
          </Button>
          <Button variant="outline" size="lg" onClick={copy}>
            <Copy /> {t("a.qr.copy")}
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink /> {t("a.qr.open")}
            </a>
          </Button>
        </div>

        <div className="no-print mx-auto mt-6 max-w-sm">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-muted-foreground">
                <RefreshCw /> {t("a.qr.regenerate")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("a.qr.regenTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("a.qr.regenText")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    m.regenerate.mutate(tb.id, {
                      onSuccess: () => toast.success(t("a.qr.regenerated")),
                      onError: (err) => toast.error(err.message),
                    })
                  }
                >
                  {t("a.qr.regenerate")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <style>{`@media print { body * { visibility: hidden; } #qr-print, #qr-print * { visibility: visible; } #qr-print { position: absolute; inset: 0; margin: auto; height: fit-content; } }`}</style>
    </div>
  );
}
