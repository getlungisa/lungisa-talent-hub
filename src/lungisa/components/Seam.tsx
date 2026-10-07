const SEAM_TOTAL_DAYS = 90;
const SEAM_CHECK_IN_DAYS = [
  0, 1, 3, 6, 10, 13, 20, 27, 34, 41, 48, 55, 62, 69, 76, 83,
] as const;

const PASSED = "#2b3a8c";
const UPCOMING = "#8c8e9c";
const THREAD = "#e6e3dc";
const DAY_90 = "#cf5c7e";

function parseStart(startedAt: string | null | undefined): Date | null {
  if (!startedAt) return null;
  const date = new Date(startedAt);
  return Number.isFinite(date.getTime()) ? date : null;
}

function dateOfDay(start: Date, day: number): Date {
  // Day 1 is the start date; day 0 is the day before.
  const date = new Date(start.getTime());
  date.setUTCDate(date.getUTCDate() + day - 1);
  return date;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function Seam({
  startedDaysAgo,
  startedAt,
  firstName,
}: {
  startedDaysAgo: number;
  startedAt?: string | null;
  firstName?: string | null;
}) {
  const day = Math.min(
    SEAM_TOTAL_DAYS,
    Math.max(1, Math.floor(startedDaysAgo) + 1),
  );
  const reached = day >= SEAM_TOTAL_DAYS;
  const start = parseStart(startedAt);
  const upcomingDay = SEAM_CHECK_IN_DAYS.find((d) => d > day) ?? null;
  const nextCheckIn =
    start && upcomingDay !== null ? formatDate(dateOfDay(start, upcomingDay)) : null;
  const day90Date = start ? formatDate(dateOfDay(start, SEAM_TOTAL_DAYS)) : null;
  const name = firstName?.trim() || null;

  const passedCount = SEAM_CHECK_IN_DAYS.filter((d) => d <= day).length;
  const labelParts = [
    reached ? `Day ${SEAM_TOTAL_DAYS} reached` : `Day ${day} of ${SEAM_TOTAL_DAYS}`,
    `${passedCount} of ${SEAM_CHECK_IN_DAYS.length} check-ins passed`,
  ];
  if (nextCheckIn) labelParts.push(`next check-in around ${nextCheckIn}`);
  const ariaLabel = `${labelParts.join(", ")}.`;

  return (
    <div className="[font-variant-numeric:lining-nums]">
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative mx-2 h-5"
      >
        <div
          className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2"
          style={{ backgroundColor: THREAD }}
        />
        <div
          className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2"
          style={{
            backgroundColor: PASSED,
            width: `${(day / SEAM_TOTAL_DAYS) * 100}%`,
          }}
        />
        {SEAM_CHECK_IN_DAYS.map((d) => {
          const passed = d <= day;
          return (
            <span
              key={d}
              data-testid="seam-stitch"
              data-passed={passed}
              className="absolute top-1/2 box-border h-[14px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${(d / SEAM_TOTAL_DAYS) * 100}%`,
                backgroundColor: passed ? PASSED : "transparent",
                border: passed ? "none" : `1.5px solid ${UPCOMING}`,
              }}
            />
          );
        })}
        <span
          data-testid="seam-day-90"
          data-reached={reached}
          className="absolute top-1/2 box-border h-4 w-4 -translate-y-1/2 translate-x-1/2 rounded-full"
          style={{
            right: 0,
            border: `2px solid ${DAY_90}`,
            backgroundColor: reached ? DAY_90 : "transparent",
          }}
        />
      </div>

      <div className="mt-3 space-y-1 text-sm text-foreground">
        <p>{reached ? `Day ${SEAM_TOTAL_DAYS} reached` : `Day ${day} of ${SEAM_TOTAL_DAYS}`}</p>
        {nextCheckIn && <p>Next check-in around {nextCheckIn}</p>}
        {day90Date && name && (
          <p>
            R3,000 at day 90 ({day90Date}), only if {name} is still with you.
          </p>
        )}
      </div>
    </div>
  );
}
