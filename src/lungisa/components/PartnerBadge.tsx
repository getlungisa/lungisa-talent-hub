export function PartnerBadge({ partner }: { partner?: string | null }) {
  const name = partner?.trim();
  if (!name) return null;

  return (
    <span className="inline-flex items-center rounded bg-primary-tint px-2.5 py-1 text-[11px] font-medium text-foreground">
      Trained with {name}
    </span>
  );
}
