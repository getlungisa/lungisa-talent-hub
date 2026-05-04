export function RatingDots({ value, label = true }: { value: number; label?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1" aria-label={`Assessment rating ${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i <= value ? "bg-accent" : "bg-border"
            }`}
          />
        ))}
      </div>
      {label && <span className="text-xs text-muted-foreground">Assessment</span>}
    </div>
  );
}