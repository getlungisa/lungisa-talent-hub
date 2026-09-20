import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Browse } from "./Browse";

const { fetchCandidatesMock } = vi.hoisted(() => ({
  fetchCandidatesMock: vi.fn(),
}));

vi.mock("../lib/dashboard", () => ({
  fetchCandidates: fetchCandidatesMock,
}));

vi.mock("../components/CandidateCard", () => ({
  CandidateCard: ({ candidate }: { candidate: { name: string } }) => <div>{candidate.name}</div>,
}));

describe("Browse", () => {
  beforeEach(() => {
    fetchCandidatesMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state while candidates are loading", () => {
    fetchCandidatesMock.mockReturnValue(new Promise(() => {}));

    render(<Browse onOpenCandidate={vi.fn()} />);

    expect(screen.getByText("Loading candidates...")).toBeInTheDocument();
  });

  it("shows an error state when candidates fail to load", async () => {
    fetchCandidatesMock.mockRejectedValue(new Error("boom"));

    render(<Browse onOpenCandidate={vi.fn()} />);

    expect(
      await screen.findByText("We could not load candidates right now. Please try again shortly."),
    ).toBeInTheDocument();
  });

  it("shows an empty state when no candidates are returned", async () => {
    fetchCandidatesMock.mockResolvedValue([]);

    render(<Browse onOpenCandidate={vi.fn()} />);

    expect(
      await screen.findByText("No candidates available yet - we are vetting more this week."),
    ).toBeInTheDocument();
  });
});
