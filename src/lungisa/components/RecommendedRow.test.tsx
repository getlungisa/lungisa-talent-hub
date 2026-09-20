import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecommendedRow } from "./RecommendedRow";

const {
  fetchCandidatesMock,
  toggleCandidateShortlistMock,
  useAuthMock,
  useLungisaMock,
  toastErrorMock,
  toggleShortlistMock,
} = vi.hoisted(() => ({
  fetchCandidatesMock: vi.fn(),
  toggleCandidateShortlistMock: vi.fn(),
  useAuthMock: vi.fn(),
  useLungisaMock: vi.fn(),
  toastErrorMock: vi.fn(),
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
  fetchCandidates: fetchCandidatesMock,
  toggleCandidateShortlist: toggleCandidateShortlistMock,
}));

vi.mock("../store", () => ({
  useLungisa: useLungisaMock,
}));

vi.mock("./Avatar", () => ({
  Avatar: ({ name }: { name: string }) => <div>{name}</div>,
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

describe("RecommendedRow shortlist interactions", () => {
  const candidate = {
    id: "candidate-1",
    name: "Ayanda",
    location: "Langa, Cape Town",
  };

  beforeEach(() => {
    fetchCandidatesMock.mockReset();
    toggleCandidateShortlistMock.mockReset();
    useAuthMock.mockReset();
    useLungisaMock.mockReset();
    toastErrorMock.mockReset();
    toggleShortlistMock.mockReset();

    fetchCandidatesMock.mockResolvedValue([candidate]);
    useAuthMock.mockReturnValue({
      user: { id: "user-1" },
    });
    useLungisaMock.mockReturnValue({
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

    render(<RecommendedRow onOpenCandidate={vi.fn()} onSeeAll={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Save to shortlist" }));

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

  it("shows the generic error toast for shortlist failures", async () => {
    toggleCandidateShortlistMock.mockRejectedValue(new Error("boom"));

    render(<RecommendedRow onOpenCandidate={vi.fn()} onSeeAll={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Save to shortlist" }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Couldn't update shortlist", {
        description: "Please try again.",
      });
    });
    expect(toggleShortlistMock).not.toHaveBeenCalled();
  });

  it("shows the required conflict toast when the candidate was already claimed", async () => {
    toggleCandidateShortlistMock.mockRejectedValue(new Error("candidate_already_claimed"));

    render(<RecommendedRow onOpenCandidate={vi.fn()} onSeeAll={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Save to shortlist" }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Candidate no longer available", {
        description:
          "Another business shortlisted this candidate first. The candidate was not added to your shortlist.",
      });
    });
    expect(toggleShortlistMock).not.toHaveBeenCalled();
  });

  it("prevents repeated shortlist clicks for the same candidate while a toggle is pending", async () => {
    const pendingToggle = deferred<boolean>();
    toggleCandidateShortlistMock.mockReturnValue(pendingToggle.promise);

    render(<RecommendedRow onOpenCandidate={vi.fn()} onSeeAll={vi.fn()} />);

    const button = await screen.findByRole("button", { name: "Save to shortlist" });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(toggleCandidateShortlistMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      pendingToggle.resolve(true);
      await pendingToggle.promise;
    });
  });

  it("shows the generic error toast without calling the RPC when no user is signed in", async () => {
    useAuthMock.mockReturnValue({
      user: null,
    });

    render(<RecommendedRow onOpenCandidate={vi.fn()} onSeeAll={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Save to shortlist" }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Couldn't update shortlist", {
        description: "Please try again.",
      });
    });
    expect(toggleCandidateShortlistMock).not.toHaveBeenCalled();
    expect(toggleShortlistMock).not.toHaveBeenCalled();
  });
});
