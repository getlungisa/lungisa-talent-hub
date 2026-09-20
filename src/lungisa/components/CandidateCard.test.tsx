import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CandidateCard } from "./CandidateCard";

const {
  toggleCandidateShortlistMock,
  useAuthMock,
  useLungisaMock,
  toastErrorMock,
  requestInterviewMock,
  toggleShortlistMock,
} = vi.hoisted(() => ({
  toggleCandidateShortlistMock: vi.fn(),
  useAuthMock: vi.fn(),
  useLungisaMock: vi.fn(),
  toastErrorMock: vi.fn(),
  requestInterviewMock: vi.fn(),
  toggleShortlistMock: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: useAuthMock,
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

vi.mock("../lib/dashboard", () => ({
  toggleCandidateShortlist: toggleCandidateShortlistMock,
}));

vi.mock("../store", () => ({
  useLungisa: useLungisaMock,
}));

vi.mock("./Avatar", () => ({
  Avatar: ({ name }: { name: string }) => <div>{name}</div>,
}));

vi.mock("./RatingDots", () => ({
  RatingDots: () => null,
}));

vi.mock("./VerifiedBadge", () => ({
  VerifiedBadge: () => null,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("CandidateCard shortlist interactions", () => {
  const candidate = {
    id: "candidate-1",
    name: "Ayanda",
    location: "Langa, Cape Town",
  };

  beforeEach(() => {
    toggleCandidateShortlistMock.mockReset();
    useAuthMock.mockReset();
    useLungisaMock.mockReset();
    toastErrorMock.mockReset();
    requestInterviewMock.mockReset();
    toggleShortlistMock.mockReset();

    useAuthMock.mockReturnValue({
      user: { id: "user-1" },
    });
    useLungisaMock.mockReturnValue({
      requested: new Set(),
      requestInterview: requestInterviewMock,
      shortlist: new Set(),
      toggleShortlist: toggleShortlistMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("waits for the persistence toggle before updating shortlist state", async () => {
    const pendingToggle = deferred<boolean>();
    toggleCandidateShortlistMock.mockReturnValue(pendingToggle.promise);

    render(<CandidateCard candidate={candidate} onOpen={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Save to shortlist" }));

    expect(toggleCandidateShortlistMock).toHaveBeenCalledWith({ id: "user-1" }, "candidate-1", false);
    expect(toggleShortlistMock).not.toHaveBeenCalled();

    await act(async () => {
      pendingToggle.resolve(true);
      await pendingToggle.promise;
    });

    await waitFor(() => {
      expect(toggleShortlistMock).toHaveBeenCalledWith("candidate-1");
    });
  });

  it("shows the required conflict toast when the candidate was already claimed", async () => {
    toggleCandidateShortlistMock.mockRejectedValue(new Error("candidate_already_claimed"));

    render(<CandidateCard candidate={candidate} onOpen={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Save to shortlist" }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Candidate no longer available", {
        description:
          "Another business shortlisted this candidate first. The candidate was not added to your shortlist.",
      });
    });
    expect(toggleShortlistMock).not.toHaveBeenCalled();
  });

  it("shows the generic error toast for other shortlist failures", async () => {
    toggleCandidateShortlistMock.mockRejectedValue(new Error("boom"));

    render(<CandidateCard candidate={candidate} onOpen={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Save to shortlist" }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Couldn't update shortlist", {
        description: "Please try again.",
      });
    });
    expect(toggleShortlistMock).not.toHaveBeenCalled();
  });

  it("prevents repeated shortlist clicks while a toggle is pending", async () => {
    const pendingToggle = deferred<boolean>();
    toggleCandidateShortlistMock.mockReturnValue(pendingToggle.promise);

    render(<CandidateCard candidate={candidate} onOpen={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Save to shortlist" });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(toggleCandidateShortlistMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      pendingToggle.resolve(true);
      await pendingToggle.promise;
    });
  });

  it("does not toggle local shortlist state if it already matches the persisted result", async () => {
    const pendingToggle = deferred<boolean>();
    toggleCandidateShortlistMock.mockReturnValue(pendingToggle.promise);

    const { rerender } = render(<CandidateCard candidate={candidate} onOpen={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Save to shortlist" }));

    useLungisaMock.mockReturnValue({
      requested: new Set(),
      requestInterview: requestInterviewMock,
      shortlist: new Set(["candidate-1"]),
      toggleShortlist: toggleShortlistMock,
    });
    rerender(<CandidateCard candidate={candidate} onOpen={vi.fn()} />);

    await act(async () => {
      pendingToggle.resolve(true);
      await pendingToggle.promise;
    });

    expect(toggleShortlistMock).not.toHaveBeenCalled();
  });

  it("reads the latest shortlist state when starting the persistence toggle", async () => {
    toggleCandidateShortlistMock.mockResolvedValue(false);

    const { rerender } = render(<CandidateCard candidate={candidate} onOpen={vi.fn()} />);

    useLungisaMock.mockReturnValue({
      requested: new Set(),
      requestInterview: requestInterviewMock,
      shortlist: new Set(["candidate-1"]),
      toggleShortlist: toggleShortlistMock,
    });
    rerender(<CandidateCard candidate={candidate} onOpen={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove from shortlist" }));
    });

    expect(toggleCandidateShortlistMock).toHaveBeenCalledWith({ id: "user-1" }, "candidate-1", true);
  });

  it("shows the generic error toast without calling the RPC when no user is signed in", async () => {
    useAuthMock.mockReturnValue({
      user: null,
    });

    render(<CandidateCard candidate={candidate} onOpen={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Save to shortlist" }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Couldn't update shortlist", {
        description: "Please try again.",
      });
    });
    expect(toggleCandidateShortlistMock).not.toHaveBeenCalled();
    expect(toggleShortlistMock).not.toHaveBeenCalled();
  });
});
