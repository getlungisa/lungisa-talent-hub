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

vi.mock("../data", () => ({
  candidates: [],
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
      await screen.findByText(
        "We could not load candidates right now. Showing saved example profiles instead.",
      ),
    ).toBeInTheDocument();
  });

  it("shows an empty state when no candidates are returned", async () => {
    fetchCandidatesMock.mockResolvedValue([]);

    render(<Browse onOpenCandidate={vi.fn()} />);

    expect(
      await screen.findByText("No candidates available yet - we are vetting more this week."),
    ).toBeInTheDocument();
  });

  it("renders fetched candidates when loading succeeds", async () => {
    fetchCandidatesMock.mockResolvedValue([
      { id: "cand-1", name: "Ayanda", location: "Langa, Cape Town" },
    ]);

    render(<Browse onOpenCandidate={vi.fn()} />);

    expect(await screen.findByText("Ayanda")).toBeInTheDocument();
  });
});
