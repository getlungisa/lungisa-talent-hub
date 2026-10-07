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
      description: "The candidate is no longer available and was not added to your shortlist.",
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

  it("sorts a copy newest-first, breaks date ties by name, and shows at most six", async () => {
    fetchMock.mockResolvedValueOnce([
      { ...candidate, id: "oldest", name: "Oldest", created_at: "2026-01-01" },
      { ...candidate, id: "tie-z", name: "Zulu tie", created_at: "2026-05-01" },
      { ...candidate, id: "newest", name: "Newest", created_at: "2026-06-01" },
      { ...candidate, id: "old", name: "Older", created_at: "2026-04-01" },
      { ...candidate, id: "tie-a", name: "Alpha tie", created_at: "2026-05-01" },
      { ...candidate, id: "second-oldest", name: "Second oldest", created_at: "2026-02-01" },
      { ...candidate, id: "seventh", name: "Seventh", created_at: "2026-01-15" },
    ]);

    render(<RecommendedRow {...props} />);

    await screen.findByRole("heading", { name: "Second oldest" });
    expect(
      screen.getAllByRole("heading").map((heading) => heading.textContent),
    ).toEqual([
      "Newest",
      "Alpha tie",
      "Zulu tie",
      "Older",
      "Second oldest",
      "Seventh",
    ]);
    expect(screen.queryByRole("heading", { name: "Oldest" })).not.toBeInTheDocument();
  });

  it("excludes placed candidates and keeps created_at desc, name asc order, max six", async () => {
    const mk = (id: string, name: string, created_at: string) => ({ id, name, created_at, location: "Cape Town" });
    fetchMock.mockResolvedValue([
      mk("p", "Placed", "2026-01-09T00:00:00Z"),
      mk("b", "Bea", "2026-01-05T00:00:00Z"),
      mk("a", "Abe", "2026-01-05T00:00:00Z"),
      mk("c", "Cy", "2026-01-08T00:00:00Z"),
      mk("d", "Dee", "2026-01-01T00:00:00Z"),
      mk("e", "Eve", "2026-01-02T00:00:00Z"),
      mk("f", "Fay", "2026-01-03T00:00:00Z"),
      mk("g", "Gus", "2025-12-01T00:00:00Z"),
    ]);
    render(<RecommendedRow {...props} placedCandidateIds={new Set(["p"])} />);
    await screen.findByRole("heading", { name: "Cy" });
    const names = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(["Cy", "Abe", "Bea", "Fay", "Eve", "Dee"]);
  });
});
