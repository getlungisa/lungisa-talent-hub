export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-accent-foreground"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {initial}
    </div>
  );
}