import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";

const {
  fetchOpenNeedsMock,
  fetchDashboardPlacementsMock,
  fetchDashboardShortlistedMock,
} = vi.hoisted(() => ({
  fetchOpenNeedsMock: vi.fn(),
  fetchDashboardPlacementsMock: vi.fn(),
  fetchDashboardShortlistedMock: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "business-user", email: "owner@example.com" },
  }),
}));

vi.mock("../store", () => ({
  useLungisa: () => ({
    employerName: "Test Business",
    requested: new Set(),
    requestInterview: vi.fn(),
    newThisWeek: 3,
  }),
}));

vi.mock("../lib/needs", () => ({
  fetchOpenNeeds: fetchOpenNeedsMock,
  relativeTime: () => "Just now",
  formatStatus: (status: string) => status,
}));

vi.mock("../lib/dashboard", () => ({
  fetchDashboardPlacements: fetchDashboardPlacementsMock,
  fetchDashboardShortlisted: fetchDashboardShortlistedMock,
}));

vi.mock("../components/RecommendedRow", () => ({
  RecommendedRow: () => null,
}));

vi.mock("../components/NeedSheet", () => ({
  NeedSheet: () => null,
}));

vi.mock("../components/PlacementRow", () => ({
  PlacementRow: () => null,
}));

vi.mock("../components/Avatar", () => ({
  Avatar: ({ name }: { name: string }) => <div>{name}</div>,
}));

describe("Dashboard", () => {
  beforeEach(() => {
    fetchOpenNeedsMock.mockResolvedValue([]);
    fetchDashboardPlacementsMock.mockResolvedValue([]);
    fetchDashboardShortlistedMock.mockResolvedValue([
      {
        candidateId: "candidate-1",
        candidateName: "Ayanda",
        location: "Langa, Cape Town",
        status: "shortlisted",
        allocatedAt: null,
      },
    ]);
  });

  it("opens a shortlisted candidate with the Candidate payload", async () => {
    const onOpenCandidate = vi.fn();

    render(<Dashboard onOpenCandidate={onOpenCandidate} onBrowse={vi.fn()} />);

    const candidateName = await screen.findByText("Ayanda");
    fireEvent.click(candidateName);

    expect(onOpenCandidate).toHaveBeenCalledWith({
      id: "candidate-1",
      name: "Ayanda",
      location: "Langa, Cape Town",
    });
  });
});
