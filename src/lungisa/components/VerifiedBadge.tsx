import { Check } from "lucide-react";

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-medium text-success">
      <Check className="h-3 w-3" strokeWidth={3} />
      Verified
    </span>
  );
}