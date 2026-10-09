import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useOrders } from "@/features/admin/queries";
import { getLang, translate } from "@/i18n";
import { formatPrice } from "@/utils/format";

let audioCtx: AudioContext | null = null;

/** Browsers only allow audio after a user gesture, so unlock the context on the first tap. */
function unlockAudio() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume();
  } catch {
    /* audio unsupported */
  }
}

/** Two-tone "ding-dong" synthesised with Web Audio — no asset needed. */
export function playChime() {
  if (!audioCtx || audioCtx.state !== "running") return;
  const now = audioCtx.currentTime;
  [
    [880, 0],
    [660, 0.18],
  ].forEach(([freq, offset]) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.5);
    osc.connect(gain).connect(audioCtx!.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.55);
  });
}

/**
 * Polls pending orders and announces any that appear after the page loaded:
 * toast + chime + vibration. Returns the pending count for nav badges.
 */
export function useNewOrderAlerts() {
  const pending = useOrders("PENDING", 5000);
  const seen = useRef<Set<number> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.addEventListener("pointerdown", unlockAudio);
    return () => window.removeEventListener("pointerdown", unlockAudio);
  }, []);

  useEffect(() => {
    const orders = pending.data;
    if (!orders) return;
    if (!seen.current) {
      seen.current = new Set(orders.map((o) => o.id));
      return;
    }
    const fresh = orders.filter((o) => !seen.current!.has(o.id));
    fresh.forEach((o) => seen.current!.add(o.id));
    if (!fresh.length) return;

    playChime();
    navigator.vibrate?.([200, 100, 200]);
    const lang = getLang();
    for (const o of fresh.slice(0, 3)) {
      toast(translate(lang, "a.newOrderToast", { table: translate(lang, "common.tableN", { n: o.tableNumber }) }), {
        description: `#${o.orderNumber} · ${translate(lang, "common.items", { count: o.itemCount })} · ${formatPrice(o.totalAmount, o.currency)}`,
        duration: 10_000,
        action: { label: translate(lang, "a.view"), onClick: () => navigate(`/admin/orders/${o.id}`) },
      });
    }
  }, [pending.data, navigate]);

  const count = pending.data?.length ?? 0;
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = count ? `(${count}) ${base}` : base;
  }, [count]);

  return count;
}
