import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CandidateCard } from "./CandidateCard";

const { toggleMock, authMock, toastMock, onChanged } = vi.hoisted(() => ({
  toggleMock: vi.fn(), authMock: vi.fn(), toastMock: vi.fn(), onChanged: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: authMock }));
vi.mock("sonner", () => ({ toast: { error: toastMock } }));
vi.mock("../lib/dashboard", () => ({ toggleCandidateShortlist: toggleMock }));
vi.mock("./Avatar", () => ({ Avatar: ({ name }: { name: string }) => <div>{name}</div> }));

const candidate = { id: "candidate-1", name: "Ayanda", location: "Langa, Cape Town" };
const props = { candidate, onOpen: vi.fn(), isShortlisted: false, isRequested: false,
  onShortlistChanged: onChanged, onInterviewRequested: vi.fn(async () => true) };

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

describe("CandidateCard shortlist interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockReturnValue({ user: { id: "user-1" } });
  });

  it("updates the parent only after the shortlist request succeeds", async () => {
    const pending = deferred<boolean>();
    toggleMock.mockReturnValue(pending.promise);
    render(<CandidateCard {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Save to shortlist" }));
    expect(toggleMock).toHaveBeenCalledWith({ id: "user-1" }, candidate.id, false);
    expect(onChanged).not.toHaveBeenCalled();
    await act(async () => { pending.resolve(true); await pending.promise; });
    expect(onChanged).toHaveBeenCalledWith(candidate.id, true);
  });

  it("prevents repeated clicks while a request is pending", async () => {
    const pending = deferred<boolean>();
    toggleMock.mockReturnValue(pending.promise);
    render(<CandidateCard {...props} />);
    const button = screen.getByRole("button", { name: "Save to shortlist" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(toggleMock).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve(true); await pending.promise; });
  });

  it("uses the saved state when removing a candidate", async () => {
    toggleMock.mockResolvedValue(false);
    render(<CandidateCard {...props} isShortlisted />);
    fireEvent.click(screen.getByRole("button", { name: "Remove from shortlist" }));
    await waitFor(() => expect(toggleMock).toHaveBeenCalledWith({ id: "user-1" }, candidate.id, true));
    expect(onChanged).toHaveBeenCalledWith(candidate.id, false);
  });

  it("explains when the candidate was claimed elsewhere", async () => {
    toggleMock.mockRejectedValue(new Error("candidate_already_claimed"));
    render(<CandidateCard {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Save to shortlist" }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith("Candidate no longer available", {
      description: "Another business shortlisted this candidate first. The candidate was not added to your shortlist.",
    }));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("shows an error without updating the shortlist when the request fails", async () => {
    toggleMock.mockRejectedValue(new Error("offline"));
    render(<CandidateCard {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Save to shortlist" }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith("Couldn't update shortlist", { description: "Please try again." }));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("does not request a change without a signed-in user", async () => {
    authMock.mockReturnValue({ user: null });
    render(<CandidateCard {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Save to shortlist" }));
    expect(toggleMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith("Couldn't update shortlist", { description: "Please try again." });
  });

  it("shows a strengths summary preview when it is non-empty", () => {
    render(
      <CandidateCard
        {...props}
        candidate={{
          ...candidate,
          strengths_summary: "  Calm under pressure and consistently warm with customers.  ",
        }}
      />,
    );

    expect(
      screen.getByText("Calm under pressure and consistently warm with customers."),
    ).toBeInTheDocument();
  });

  it("omits the strengths summary preview when it is blank", () => {
    render(
      <CandidateCard
        {...props}
        candidate={{
          ...candidate,
          strengths_summary: "   ",
        }}
      />,
    );

    expect(
      screen.queryByText(/Calm under pressure and consistently warm with customers\./),
    ).not.toBeInTheDocument();
  });
});
