import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CandidateDetail } from "./CandidateDetail";

const { fetchCandidateMock, fetchInterviewRequestedCandidateIdsMock, insertBusinessActivityMock, useAuthMock } = vi.hoisted(() => ({
  fetchCandidateMock: vi.fn(),
  fetchInterviewRequestedCandidateIdsMock: vi.fn(),
  insertBusinessActivityMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("../lib/dashboard", () => ({
  fetchCandidate: fetchCandidateMock,
  fetchDashboardShortlisted: vi.fn().mockResolvedValue([]),
  toggleCandidateShortlist: vi.fn(),
  fetchInterviewRequestedCandidateIds: fetchInterviewRequestedCandidateIdsMock,
  insertBusinessActivity: insertBusinessActivityMock,
}));

vi.mock("../data", () => ({
  candidates: [],
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: useAuthMock,
}));

describe("CandidateDetail", () => {
  beforeEach(() => {
    fetchCandidateMock.mockReset();
    fetchInterviewRequestedCandidateIdsMock.mockReset();
    insertBusinessActivityMock.mockReset();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ user: null });
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

  it("renders fetched details under What stood out with partner attribution", async () => {
    fetchCandidateMock.mockResolvedValue({
      id: "real-1",
      name: "Sipho",
      location: "Khayelitsha, Cape Town",
      strengths_summary: "Excellent follow-through and calm communication.",
      training_partner: { name: "Partner Org" },
    });

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Sipho" })).toHaveClass(
      "text-[28px]",
      "sm:text-[32px]",
      "font-semibold",
      "tracking-[-0.01em]",
    );
    expect(screen.getAllByText("Khayelitsha, Cape Town")).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "What stood out" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Based on Partner Org's trainer assessment"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "R1,000 on hire. R3,000 at day 90, only if they're still with you.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Excellent follow-through and calm communication."),
    ).toBeInTheDocument();
  });

  it("omits the strengths summary section when the value is blank", async () => {
    fetchCandidateMock.mockResolvedValue({
      id: "real-1",
      name: "Sipho",
      location: "Khayelitsha, Cape Town",
      strengths_summary: "   ",
    });

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Sipho" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "What stood out" }),
    ).not.toBeInTheDocument();
  });

  it("shows the reference note when it is set", async () => {
    fetchCandidateMock.mockResolvedValue({
      id: "real-1",
      name: "Sipho",
      location: "Khayelitsha, Cape Town",
      reference_note: "Referred by a previous employer.",
    });

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);

    expect(
      await screen.findByText("Reference: Referred by a previous employer."),
    ).toBeInTheDocument();
  });

  it("omits the reference note when the value is blank", async () => {
    fetchCandidateMock.mockResolvedValue({
      id: "real-1",
      name: "Sipho",
      location: "Khayelitsha, Cape Town",
      reference_note: "   ",
    });

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Sipho" })).toBeInTheDocument();
    expect(screen.queryByText(/^Reference:/)).not.toBeInTheDocument();
  });
});
