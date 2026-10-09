import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      offset={12}
      toastOptions={{
        classNames: {
          toast: "rounded-2xl border border-border bg-card text-foreground shadow-lift font-sans",
          description: "text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground !rounded-full !font-semibold",
        },
      }}
    />
  );
}
