import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/contexts/AuthContext";
import { Browse } from "./Browse";

const {
  fetchCandidatesMock,
  fetchDashboardShortlistedMock,
  fetchInterviewRequestedCandidateIdsMock,
  authMock,
} = vi.hoisted(() => ({
  fetchCandidatesMock: vi.fn(),
  fetchDashboardShortlistedMock: vi.fn(),
  fetchInterviewRequestedCandidateIdsMock: vi.fn(),
  authMock: {
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    getSession: vi.fn(() =>
      Promise.resolve({ data: { session: { user: { id: "test-user" } } } }),
    ),
    signOut: vi.fn(),
  },
}));

vi.mock("../lib/dashboard", () => ({
  fetchCandidates: fetchCandidatesMock,
  fetchDashboardShortlisted: fetchDashboardShortlistedMock,
  fetchInterviewRequestedCandidateIds: fetchInterviewRequestedCandidateIdsMock,
  requestCandidateInterview: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: authMock },
}));

vi.mock("../components/CandidateCard", () => ({
  CandidateCard: ({ candidate }: { candidate: { name: string } }) => (
    <div data-testid="candidate-card">{candidate.name}</div>
  ),
}));

vi.mock("../data", () => ({
  candidates: [
    { id: "ayanda", firstName: "Ayanda" },
    { id: "nomvula", firstName: "Nomvula" },
  ],
}));

describe("Browse", () => {
  beforeEach(() => {
    fetchCandidatesMock.mockReset();
    fetchDashboardShortlistedMock.mockReset().mockResolvedValue([]);
    fetchInterviewRequestedCandidateIdsMock.mockReset().mockResolvedValue(new Set());
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state while candidates are loading", async () => {
    fetchCandidatesMock.mockReturnValue(new Promise(() => {}));

    render(
      <AuthProvider>
        <Browse onOpenCandidate={vi.fn()} />
      </AuthProvider>,
    );

    expect(screen.getByRole("heading", { name: "Verified candidates" })).toHaveClass(
      "text-[28px]",
      "sm:text-[32px]",
      "font-semibold",
      "tracking-[-0.01em]",
    );
    await waitFor(() => expect(fetchCandidatesMock).toHaveBeenCalled());
    expect(await screen.findByText("Loading candidates...")).toBeInTheDocument();
  });

  it("shows an error state when candidates fail to load", async () => {
    fetchCandidatesMock.mockRejectedValue(new Error("boom"));

    render(
      <AuthProvider>
        <Browse onOpenCandidate={vi.fn()} />
      </AuthProvider>,
    );

    expect(
      await screen.findByText("We could not load candidates right now. Please try again shortly."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No candidates available yet - we are vetting more this week.")).not.toBeInTheDocument();
    expect(screen.queryByText("Ayanda")).not.toBeInTheDocument();
    expect(screen.queryByText("Nomvula")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("candidate-card")).toHaveLength(0);
  });

  it("shows an empty state when no candidates are returned", async () => {
    fetchCandidatesMock.mockResolvedValue([]);

    render(
      <AuthProvider>
        <Browse onOpenCandidate={vi.fn()} />
      </AuthProvider>,
    );

    await waitFor(() => expect(fetchCandidatesMock).toHaveBeenCalled());
    expect(
      await screen.findByText("No candidates available yet - we are vetting more this week."),
    ).toBeInTheDocument();
  });

  it("renders fetched candidates when loading succeeds", async () => {
    fetchCandidatesMock.mockResolvedValue([
      { id: "cand-1", name: "Ayanda", location: "Langa, Cape Town" },
    ]);

    render(
      <AuthProvider>
        <Browse onOpenCandidate={vi.fn()} />
      </AuthProvider>,
    );

    expect(await screen.findByText("Ayanda")).toBeInTheDocument();
  });
});
