import { Banknote, CreditCard, Wallet, type LucideIcon } from "lucide-react";
import type { PaymentMethod } from "@/types";

export const METHODS: { value: PaymentMethod; icon: LucideIcon }[] = [
  { value: "CASH", icon: Banknote },
  { value: "CARD", icon: CreditCard },
  { value: "OTHER", icon: Wallet },
];
