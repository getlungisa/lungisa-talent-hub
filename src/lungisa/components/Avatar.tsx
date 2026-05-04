const palette = [
  "bg-[hsl(19_63%_44%)] text-white",
  "bg-[hsl(22_47%_18%)] text-white",
  "bg-[hsl(36_45%_55%)] text-white",
  "bg-[hsl(140_25%_35%)] text-white",
  "bg-[hsl(10_45%_50%)] text-white",
];

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initial = name.charAt(0).toUpperCase();
  const idx = name.charCodeAt(0) % palette.length;
  return (
    <div
      className={`flex items-center justify-center rounded-full font-display ${palette[idx]}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {initial}
    </div>
  );
}