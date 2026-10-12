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
    expect(screen.getAllByText("Khayelitsha, Cape Town")).toHaveLength(1);
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

  it("shows trained on, work history and proud of when set", async () => {
    fetchCandidateMock.mockResolvedValue({
      id: "real-1",
      name: "Sipho",
      location: "Khayelitsha, Cape Town",
      trained_on: "Barista course",
      work_history: "2 yrs, Café X",
      proud_of: "Finishing my course",
    });

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);

    expect(await screen.findByText("Trained on")).toBeInTheDocument();
    expect(screen.getByText("Barista course")).toBeInTheDocument();
    expect(screen.getByText("Work history")).toBeInTheDocument();
    expect(screen.getByText("Proud of")).toBeInTheDocument();
  });

  it("renders profile sections in the requested order, omitting blank optional sections", async () => {
    fetchCandidateMock.mockResolvedValue({
      id: "real-1",
      name: "Sipho",
      location: "Khayelitsha, Cape Town",
      strengths_summary: "Reliable and thoughtful.",
      reference_note: "Referred by a previous employer.",
      trained_on: "Barista course",
      work_history: "   ",
      proud_of: "Finishing my course",
    });

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);
    const name = await screen.findByRole("heading", { name: "Sipho" });
    const location = screen.getByText("Khayelitsha, Cape Town");
    expect(name.closest("header")).toContainElement(location);

    const sections = [
      name,
      screen.queryByRole("heading", { name: "What stood out" }),
      screen.queryByText("Reference: Referred by a previous employer."),
      screen.queryByText("Trained on"),
      screen.queryByText("Work history"),
      screen.queryByText("Proud of"),
    ].filter((section): section is HTMLElement => section !== null);

    expect(sections).toHaveLength(5);
    for (let index = 1; index < sections.length; index += 1) {
      expect(
        sections[index - 1].compareDocumentPosition(sections[index]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("omits the new fields when null or blank", async () => {
    fetchCandidateMock.mockResolvedValue({
      id: "real-1",
      name: "Sipho",
      location: "Khayelitsha, Cape Town",
      trained_on: null,
      work_history: "  ",
    });

    render(<CandidateDetail id="real-1" onBack={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Sipho" })).toBeInTheDocument();
    expect(screen.queryByText("Trained on")).not.toBeInTheDocument();
    expect(screen.queryByText("Work history")).not.toBeInTheDocument();
    expect(screen.queryByText("Proud of")).not.toBeInTheDocument();
  });
});
