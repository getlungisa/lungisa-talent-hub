import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLungisa } from "../store";
import { useState } from "react";
import { toast } from "sonner";

const bundles = [
  { credits: 1, price: 350, label: "Single interview", note: "For when you have someone specific in mind." },
  { credits: 3, price: 900, label: "Bundle of 3", note: "Most employers start here.", popular: true },
  { credits: 5, price: 1400, label: "Bundle of 5", note: "Best value if you are hiring across roles." },
];

export function TopUpModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { topUp } = useLungisa();
  const [chosen, setChosen] = useState<number | null>(null);

  const buy = (n: number) => {
    setChosen(n);
    setTimeout(() => {
      topUp(n);
      toast.success(`${n} credit${n > 1 ? "s" : ""} added to your account.`);
      setChosen(null);
      onOpenChange(false);
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">Top up interview credits</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            One credit lets you request an interview with one verified candidate.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 grid gap-3">
          {bundles.map((b) => (
            <button
              key={b.credits}
              onClick={() => buy(b.credits)}
              disabled={chosen !== null}
              className="group flex items-center justify-between rounded-xl border border-border bg-background p-4 text-left transition hover:border-accent hover:bg-accent-soft disabled:opacity-60"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg text-primary">{b.label}</span>
                  {b.popular && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-foreground">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{b.note}</p>
              </div>
              <div className="text-right">
                <div className="font-display text-xl text-primary">R{b.price.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  {b.credits} credit{b.credits > 1 ? "s" : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          No subscription. Credits never expire. Pay only for the interviews you request.
        </p>
      </DialogContent>
    </Dialog>
  );
}