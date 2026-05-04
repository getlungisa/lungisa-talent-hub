import { useState } from "react";
import { useLungisa } from "../store";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Coins, Plus } from "lucide-react";
import { TopUpModal } from "./TopUpModal";

const bundles = [
  { credits: 1, price: 350, label: "Single" },
  { credits: 3, price: 900, label: "Bundle of 3", popular: true },
  { credits: 5, price: 1400, label: "Bundle of 5" },
];

export function CreditsChip() {
  const { credits, topUp } = useLungisa();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-primary transition hover:border-accent hover:text-accent"
            aria-label="Credits"
          >
            <Coins className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
            <span className="font-medium">{credits}</span>
            <span className="hidden text-muted-foreground sm:inline">credits</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-72 border-border bg-card p-0"
        >
          <div className="border-b border-border p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Balance
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-3xl text-primary">{credits}</span>
              <span className="text-sm text-muted-foreground">
                interview credit{credits === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <div className="p-2">
            {bundles.map((b) => (
              <button
                key={b.credits}
                onClick={() => {
                  topUp(b.credits);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition hover:bg-accent-soft"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-primary">{b.label}</span>
                    {b.popular && (
                      <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-accent-foreground">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.credits} credit{b.credits > 1 ? "s" : ""}
                  </div>
                </div>
                <span className="font-display text-base text-primary">
                  R{b.price.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-border p-3">
            <button
              onClick={() => {
                setOpen(false);
                setModalOpen(true);
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition hover:brightness-95"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> See all top-up options
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <TopUpModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
