import type { User } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: fromMock,
  },
}));

import { fetchDashboardPlacements } from "./dashboard";

describe("fetchDashboardPlacements", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T00:00:00Z"));
    fromMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("derives placement day values from placement_date", async () => {
    const businessQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "business-1" },
        error: null,
      }),
    };

    const placementsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            candidate_id: "candidate-1",
            placement_date: "2026-09-10T00:00:00Z",
            status: "active",
            candidates: {
              id: "candidate-1",
              name: "Jane Doe",
              location: "Cape Town",
            },
          },
        ],
        error: null,
      }),
    };

    fromMock.mockImplementation((table: string) => {
      if (table === "businesses") return businessQuery;
      if (table === "placements") return placementsQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const user = { id: "user-1" } as User;
    const placements = await fetchDashboardPlacements(user);

    expect(placementsQuery.select).toHaveBeenCalledWith(
      "candidate_id, placement_date, status, candidates!placements_candidate_id_fkey(id, name, location)",
    );
    expect(placementsQuery.order).toHaveBeenCalledWith("placement_date", {
      ascending: false,
    });
    expect(placements).toEqual([
      {
        candidateId: "candidate-1",
        candidateName: "Jane Doe",
        location: "Cape Town",
        startedDaysAgo: 4,
        totalDays: 4,
        startedAt: "2026-09-10T00:00:00Z",
        status: "active",
      },
    ]);
  });
});
