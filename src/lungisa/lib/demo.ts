export const DEMO_LOCATION = "Cape Town";

const DEMO_MODE_KEY = "lungisa-demo-mode";
const candidateLabels = new Map<string, string>();

let demoMode = false;

export function initDemoMode(): void {
  if (typeof window === "undefined") return;

  const requestedMode = new URLSearchParams(window.location.search).get("demo");
  try {
    if (requestedMode === "1") {
      window.sessionStorage.setItem(DEMO_MODE_KEY, "1");
    } else if (requestedMode === "0") {
      window.sessionStorage.removeItem(DEMO_MODE_KEY);
    }
    demoMode = window.sessionStorage.getItem(DEMO_MODE_KEY) === "1";
  } catch {
    demoMode = requestedMode === "1";
  }

  document.documentElement.classList.toggle("demo-on", demoMode);
}

export function isDemoMode(): boolean {
  return demoMode;
}

function labelForCandidate(id: string): string {
  const knownLabel = candidateLabels.get(id);
  if (knownLabel) return knownLabel;

  let number = candidateLabels.size;
  let suffix = "";
  do {
    suffix = String.fromCharCode(65 + (number % 26)) + suffix;
    number = Math.floor(number / 26) - 1;
  } while (number >= 0);

  const label = `Candidate ${suffix}`;
  candidateLabels.set(id, label);
  return label;
}

export function demoName(id: string, name: string): string {
  return isDemoMode() ? labelForCandidate(id) : name;
}

export function demoLocation(
  location: string | null | undefined,
): string | null | undefined {
  return isDemoMode() ? DEMO_LOCATION : location;
}

export function demoCandidate<T extends object>(candidate: T): T {
  if (!isDemoMode()) return candidate;

  const value = candidate as Record<string, unknown>;
  const id =
    typeof value.id === "string"
      ? value.id
      : typeof value.candidateId === "string"
        ? value.candidateId
        : null;

  if (!id) return candidate;

  const nameKey = "name" in value ? "name" : "candidateName";
  const locationKey =
    "candidateLocation" in value ? "candidateLocation" : "location";
  const name = value[nameKey];
  const unavailable = nameKey === "candidateName" && name == null;

  return {
    ...value,
    ...(typeof name === "string" && { [nameKey]: demoName(id, name) }),
    ...(locationKey in value && !unavailable && {
      [locationKey]: demoLocation(value[locationKey] as string | null),
    }),
  } as T;
}
