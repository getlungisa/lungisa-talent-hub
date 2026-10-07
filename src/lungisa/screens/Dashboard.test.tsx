import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";

const {
  authUser,
  fetchOpenNeedsMock,
  fetchDashboardPlacementsMock,
  fetchDashboardShortlistedMock,
  fetchNewCandidatesThisWeekCountMock,
  fetchTrainingPartnerCandidatesMock,
  toggleCandidateShortlistMock,
} = vi.hoisted(() => ({
  authUser: { id: "business-user", email: "owner@example.com" },
  fetchOpenNeedsMock: vi.fn(),
  fetchDashboardPlacementsMock: vi.fn(),
  fetchDashboardShortlistedMock: vi.fn(),
  fetchNewCandidatesThisWeekCountMock: vi.fn(),
  fetchTrainingPartnerCandidatesMock: vi.fn(),
  toggleCandidateShortlistMock: vi.fn(),
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
  fetchNewCandidatesThisWeekCount: fetchNewCandidatesThisWeekCountMock,
  fetchTrainingPartnerCandidates: fetchTrainingPartnerCandidatesMock,
  toggleCandidateShortlist: toggleCandidateShortlistMock,
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
        isAvailable: true,
        createdAt: null,
      },
    ]);
    fetchNewCandidatesThisWeekCountMock.mockResolvedValue(3);
    fetchTrainingPartnerCandidatesMock.mockResolvedValue([]);
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

    expect(
      await screen.findByRole("heading", { name: /, Test Business$/ }),
    ).toHaveClass(
      "text-[28px]",
      "sm:text-[32px]",
      "font-semibold",
      "tracking-[-0.01em]",
    );
    expect(screen.getByRole("heading", { name: "Shortlist" })).toHaveClass(
      "text-2xl",
      "font-semibold",
    );
    const candidateName = await screen.findByRole("heading", { name: "Ayanda" });
    fireEvent.click(candidateName);

    expect(onOpenCandidate).toHaveBeenCalledWith({
      id: "candidate-1",
      name: "Ayanda",
      location: "Langa, Cape Town",
    });
  });

  it("hides unavailable candidate details and allows removal", async () => {
    fetchDashboardShortlistedMock.mockResolvedValueOnce([
      {
        candidateId: "candidate-placed",
        candidateName: null,
        location: null,
        isAvailable: false,
        createdAt: null,
      },
    ]);
    toggleCandidateShortlistMock.mockResolvedValue(false);

    render(
      <Dashboard
        isTrainingPartner={false}
        onOpenCandidate={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );

    expect(await screen.findByText("No longer available")).toBeInTheDocument();
    expect(screen.queryByText("Ayanda")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove unavailable candidate from shortlist",
      }),
    );

    expect(toggleCandidateShortlistMock).toHaveBeenCalledWith(
      authUser,
      "candidate-placed",
      true,
    );
    expect(await screen.findByText("You have no shortlisted candidates yet.")).toBeInTheDocument();
  });

  it("shows Available for a trainer candidate with a legacy shortlisted status", async () => {
    fetchTrainingPartnerCandidatesMock.mockResolvedValue([
      {
        id: "candidate-legacy",
        name: "Lindiwe",
        location: "Khayelitsha, Cape Town",
        status: "shortlisted",
        businessName: null,
      },
    ]);

    render(
      <Dashboard
        isTrainingPartner={true}
        onOpenCandidate={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );

    await screen.findByRole("heading", { name: "Lindiwe" });
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.queryByText("Shortlisted")).not.toBeInTheDocument();
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

    const heroLayout = await screen.findByTestId("dashboard-hero");

    expect(heroLayout).toHaveClass("sm:justify-between");
    expect(heroLayout).not.toHaveClass("max-w-4xl");
  });

  it("pluralises the placements in progress line", async () => {
    const placement = (candidateId: string) => ({
      candidateId,
      candidateName: "Name",
      location: null,
      startedDaysAgo: 3,
      totalDays: 90,
      startedAt: "2026-01-01",
      status: "active",
    });

    fetchDashboardPlacementsMock.mockResolvedValueOnce([placement("a")]);
    const { unmount } = render(
      <Dashboard
        isTrainingPartner={false}
        onOpenCandidate={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );
    expect(await screen.findByText("1 placement in progress")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Placements" })).toHaveClass(
      "text-2xl",
      "font-semibold",
    );
    unmount();

    fetchDashboardPlacementsMock.mockResolvedValueOnce([
      placement("a"),
      placement("b"),
    ]);
    render(
      <Dashboard
        isTrainingPartner={false}
        onOpenCandidate={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );
    expect(await screen.findByText("2 placements in progress")).toBeInTheDocument();
  });

  it("omits the placements line and section when there are none", async () => {
    render(
      <Dashboard
        isTrainingPartner={false}
        onOpenCandidate={vi.fn()}
        onBrowse={vi.fn()}
      />,
    );

    await screen.findByRole("heading", { name: "Ayanda" });
    expect(screen.queryByText(/in progress/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Placements" }),
    ).not.toBeInTheDocument();
  });
});
