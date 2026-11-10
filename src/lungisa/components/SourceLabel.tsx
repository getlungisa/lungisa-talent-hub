import type { ReactNode } from "react";

export function SourceLabel({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-foreground">
      <span className="h-[10px] w-[10px] shrink-0 bg-primary" aria-hidden="true" />
      {children}
    </p>
  );
}
