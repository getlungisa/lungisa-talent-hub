import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Activity } from "./Activity";

const {
  fetchBrowsedCountMock,
  fetchDashboardPlacementsMock,
  fetchRecentActivityMock,
  user,
} = vi.hoisted(() => ({
  fetchBrowsedCountMock: vi.fn(),
  fetchDashboardPlacementsMock: vi.fn(),
  fetchRecentActivityMock: vi.fn(),
  user: { id: "business-user" },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user }),
}));

vi.mock("../components/Avatar", () => ({
  Avatar: ({ name }: { name: string }) => <div>{name}</div>,
}));

vi.mock("../lib/dashboard", () => ({
  fetchBrowsedCount: fetchBrowsedCountMock,
  fetchDashboardPlacements: fetchDashboardPlacementsMock,
  fetchRecentActivity: fetchRecentActivityMock,
}));

describe("Activity", () => {
  beforeEach(() => {
    fetchBrowsedCountMock.mockResolvedValue(0);
    fetchDashboardPlacementsMock.mockResolvedValue([]);
    fetchRecentActivityMock.mockResolvedValue([
      {
        candidateId: "candidate-1",
        candidateName: "Kagiso Example",
        candidateLocation: "Langa",
        actionType: "interview_requested",
        actionDate: "2026-10-01",
      },
    ]);
  });

  it("shows an interview count that matches the listed requests", async () => {
    render(<Activity />);

    expect(screen.getByRole("heading", { name: "Activity" })).toHaveClass(
      "text-[28px]",
      "sm:text-[32px]",
      "font-semibold",
      "tracking-[-0.01em]",
    );
    expect(
      await screen.findByText("Kagiso Example", { selector: ".font-display" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();

    const count = screen.getByText("1");
    expect(count.parentElement?.parentElement).toHaveTextContent(
      "Interview requested",
    );
  });
});
