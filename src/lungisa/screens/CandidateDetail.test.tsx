import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CandidateDetail } from "./CandidateDetail";

const { fetchCandidateMock } = vi.hoisted(() => ({
  fetchCandidateMock: vi.fn(),
}));

vi.mock("../lib/dashboard", () => ({
  fetchCandidate: fetchCandidateMock,
}));

vi.mock("../data", () => ({
  candidates: [],
}));

describe("CandidateDetail", () => {
  beforeEach(() => {
    fetchCandidateMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state while the candidate is loading", () => {
    fetchCandidateMock.mockReturnValue(new Promise(() => {}));

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);

    expect(screen.getByText("Loading candidate...")).toBeInTheDocument();
  });

  it("shows an error state when the candidate fails to load", async () => {
    fetchCandidateMock.mockRejectedValue(new Error("boom"));

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);

    expect(
      await screen.findByText("We could not load this candidate right now. Please try again shortly."),
    ).toBeInTheDocument();
  });

  it("shows a not-found state when the candidate does not exist", async () => {
    fetchCandidateMock.mockResolvedValue(null);

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);

    expect(await screen.findByText("Candidate not found.")).toBeInTheDocument();
  });

  it("renders fetched candidate details when the candidate exists", async () => {
    fetchCandidateMock.mockResolvedValue({
      id: "real-1",
      name: "Sipho",
      location: "Khayelitsha, Cape Town",
    });

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Sipho" })).toBeInTheDocument();
    expect(screen.getAllByText("Khayelitsha, Cape Town")).toHaveLength(2);
  });
});
