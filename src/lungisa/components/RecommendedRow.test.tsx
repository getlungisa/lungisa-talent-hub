import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecommendedRow } from "./RecommendedRow";

const { fetchMock, toggleMock, authMock, toastMock, onChanged } = vi.hoisted(() => ({
  fetchMock: vi.fn(), toggleMock: vi.fn(), authMock: vi.fn(), toastMock: vi.fn(), onChanged: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: authMock }));
vi.mock("sonner", () => ({ toast: { error: toastMock } }));
vi.mock("../lib/dashboard", () => ({ fetchCandidates: fetchMock, toggleCandidateShortlist: toggleMock }));
vi.mock("./Avatar", () => ({ Avatar: ({ name }: { name: string }) => <div>{name}</div> }));

const candidate = { id: "candidate-1", name: "Ayanda", location: "Langa, Cape Town" };
const props = { onOpenCandidate: vi.fn(), onSeeAll: vi.fn(), shortlistedIds: new Set<string>(), onShortlistChanged: onChanged };

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

describe("RecommendedRow shortlist interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue([candidate]);
    authMock.mockReturnValue({ user: { id: "user-1" } });
  });

  it("shows a pluralised new-candidates subtitle only when the count is positive", async () => {
    const { rerender } = render(<RecommendedRow {...props} newThisWeek={1} />);
    expect(screen.getByText("Recommended for you")).toHaveClass(
      "text-2xl",
      "font-semibold",
    );
    expect(await screen.findByText(/1 new candidate verified this week/)).toBeInTheDocument();
    rerender(<RecommendedRow {...props} newThisWeek={3} />);
    expect(screen.getByText(/3 new candidates verified this week/)).toBeInTheDocument();
    rerender(<RecommendedRow {...props} newThisWeek={0} />);
    expect(screen.queryByText(/verified this week/)).not.toBeInTheDocument();
  });

  it("updates the parent only after the shortlist request succeeds", async () => {
    const pending = deferred<boolean>();
    toggleMock.mockReturnValue(pending.promise);
    render(<RecommendedRow {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Save to shortlist" }));
    expect(toggleMock).toHaveBeenCalledWith({ id: "user-1" }, candidate.id, false);
    expect(onChanged).not.toHaveBeenCalled();
    await act(async () => { pending.resolve(true); await pending.promise; });
    expect(onChanged).toHaveBeenCalledWith(candidate.id, true);
  });

  it("prevents repeated clicks for the same candidate while pending", async () => {
    const pending = deferred<boolean>();
    toggleMock.mockReturnValue(pending.promise);
    render(<RecommendedRow {...props} />);
    const button = await screen.findByRole("button", { name: "Save to shortlist" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(toggleMock).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve(true); await pending.promise; });
  });

  it("uses saved state when removing a candidate", async () => {
    toggleMock.mockResolvedValue(false);
    render(<RecommendedRow {...props} shortlistedIds={new Set([candidate.id])} />);
    fireEvent.click(await screen.findByRole("button", { name: "Remove from shortlist" }));
    await waitFor(() => expect(toggleMock).toHaveBeenCalledWith({ id: "user-1" }, candidate.id, true));
    expect(onChanged).toHaveBeenCalledWith(candidate.id, false);
  });

  it("shows a conflict when a candidate was claimed elsewhere", async () => {
    toggleMock.mockRejectedValue(new Error("candidate_already_claimed"));
    render(<RecommendedRow {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Save to shortlist" }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith("Candidate no longer available", {
      description: "Another business shortlisted this candidate first. The candidate was not added to your shortlist.",
    }));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("reports other failures without changing the shortlist", async () => {
    toggleMock.mockRejectedValue(new Error("offline"));
    render(<RecommendedRow {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Save to shortlist" }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith("Couldn't update shortlist", { description: "Please try again." }));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("does not request a change without a signed-in user", async () => {
    authMock.mockReturnValue({ user: null });
    render(<RecommendedRow {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Save to shortlist" }));
    expect(toggleMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith("Couldn't update shortlist", { description: "Please try again." });
  });

  it("applies width-constrained wrappers to the candidate header", async () => {
    render(<RecommendedRow {...props} />);
    const heading = await screen.findByRole("heading", { name: candidate.name });
    const avatarWrapper = heading.closest("div")?.parentElement;
    expect(avatarWrapper).toHaveClass("flex", "min-w-0", "flex-1", "items-center", "gap-2.5");
    const header = avatarWrapper?.parentElement;
    expect(header).toHaveClass("flex", "w-full", "min-w-0", "items-start", "gap-2");
  });
});
