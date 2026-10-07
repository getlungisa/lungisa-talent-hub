export function isPlaceholderBusinessName(name: string | null | undefined) {
  const trimmedName = name?.trim() ?? "";
  return (
    trimmedName === "" ||
    trimmedName === "Business" ||
    trimmedName === "Loading..." ||
    /^Business\s+\S+/.test(trimmedName)
  );
}
