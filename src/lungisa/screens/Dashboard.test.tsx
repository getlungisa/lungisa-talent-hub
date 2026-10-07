import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";

const {
  authUser,
  fetchOpenNeedsMock,
  fetchDashboardPlacementsMock,
  fetchDashboardShortlistedMock,
  fetchTrainingPartnerCandidatesMock,
  fetchNewCandidatesThisWeekCountMock,
} = vi.hoisted(() => ({
  authUser: { id: "business-user", email: "owner@example.com" },
  fetchOpenNeedsMock: vi.fn(),
  fetchDashboardPlacementsMock: vi.fn(),
  fetchDashboardShortlistedMock: vi.fn(),
  fetchTrainingPartnerCandidatesMock: vi.fn(),
  fetchNewCandidatesThisWeekCountMock: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: authUser,
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
  fetchTrainingPartnerCandidates: fetchTrainingPartnerCandidatesMock,
  fetchNewCandidatesThisWeekCount: fetchNewCandidatesThisWeekCountMock,
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
    fetchTrainingPartnerCandidatesMock.mockResolvedValue([]);
    fetchNewCandidatesThisWeekCountMock.mockResolvedValue(3);
  });

  it("opens a shortlisted candidate with the Candidate payload", async () => {
    const onOpenCandidate = vi.fn();

    render(
      <Dashboard
        isTrainingPartner={false}
        onOpenCandidate={onOpenCandidate}
        onBrowse={vi.fn()}
      />,
    );

    const candidateName = await screen.findByRole("heading", { name: "Ayanda" });
    fireEvent.click(candidateName);

    expect(onOpenCandidate).toHaveBeenCalledWith({
      id: "candidate-1",
      name: "Ayanda",
      location: "Langa, Cape Town",
    });
  });

  it("opens a training-partner candidate with the training-partner context", async () => {
    const onOpenCandidate = vi.fn();

    fetchTrainingPartnerCandidatesMock.mockResolvedValue([
      {
        id: "candidate-2",
        name: "Lindiwe",
        location: "Khayelitsha, Cape Town",
        status: "available",
        businessName: null,
      },
    ]);

    render(
      <Dashboard
        isTrainingPartner={true}
        onOpenCandidate={onOpenCandidate}
        onBrowse={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole("heading", { name: "Lindiwe" }));

    expect(onOpenCandidate).toHaveBeenCalledWith(
      {
        id: "candidate-2",
        name: "Lindiwe",
        location: "Khayelitsha, Cape Town",
      },
      true,
    );
  });

  it("uses the full content width for the hero section", async () => {
    render(
      <Dashboard
        isTrainingPartner={false}
        onOpenCandidate={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );

    await screen.findByText(/verified this week/i);

    const heroLayout = screen.getByTestId("dashboard-hero");

    expect(heroLayout).toHaveClass("sm:justify-between");
    expect(heroLayout).not.toHaveClass("max-w-4xl");
  });

  it("pluralises the new-candidate count", async () => {
    fetchNewCandidatesThisWeekCountMock.mockResolvedValueOnce(1);

    render(
      <Dashboard
        isTrainingPartner={false}
        onOpenCandidate={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );

    expect(await screen.findByText(/1 new candidate/)).toBeInTheDocument();
    expect(screen.queryByText(/1 new candidates/)).not.toBeInTheDocument();
  });
});
