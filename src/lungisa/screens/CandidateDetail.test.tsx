import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CandidateDetail } from "./CandidateDetail";

const { fetchCandidatesMock } = vi.hoisted(() => ({
  fetchCandidatesMock: vi.fn(),
}));

vi.mock("../lib/dashboard", () => ({
  fetchCandidates: fetchCandidatesMock,
}));

vi.mock("../data", () => ({
  candidates: [],
}));

describe("CandidateDetail", () => {
  beforeEach(() => {
    fetchCandidatesMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state while the candidate is loading", () => {
    fetchCandidatesMock.mockReturnValue(new Promise(() => {}));

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);

    expect(screen.getByText("Loading candidate...")).toBeInTheDocument();
  });

  it("shows an error state when the candidate fails to load", async () => {
    fetchCandidatesMock.mockRejectedValue(new Error("boom"));

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);

    expect(
      await screen.findByText("We could not load this candidate right now. Please try again shortly."),
    ).toBeInTheDocument();
  });

  it("shows a not-found state when the candidate does not exist", async () => {
    fetchCandidatesMock.mockResolvedValue([]);

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);

    expect(await screen.findByText("Candidate not found.")).toBeInTheDocument();
  });

  it("renders fetched candidate details when the candidate exists", async () => {
    fetchCandidatesMock.mockResolvedValue([
      { id: "real-1", name: "Sipho", location: "Khayelitsha, Cape Town" },
    ]);

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Sipho" })).toBeInTheDocument();
    expect(screen.getAllByText("Khayelitsha, Cape Town")).toHaveLength(2);
  });
});
