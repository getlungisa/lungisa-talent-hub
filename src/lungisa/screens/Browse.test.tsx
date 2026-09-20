import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LungisaProvider } from "../store";
import { Browse } from "./Browse";
import { fetchCandidates, type BrowseCandidate } from "../lib/candidates";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    session: null,
    user: null,
    loading: false,
    signOut: async () => {},
  }),
}));

vi.mock("../lib/candidates", async () => {
  const actual = await vi.importActual<typeof import("../lib/candidates")>("../lib/candidates");

  return {
    ...actual,
    fetchCandidates: vi.fn(),
  };
});

const mockedFetchCandidates = vi.mocked(fetchCandidates);

function renderBrowse() {
  return render(
    <LungisaProvider>
      <Browse onOpenCandidate={vi.fn()} />
    </LungisaProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("Browse", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("renders a loading state while candidates are loading", () => {
    const pending = deferred<BrowseCandidate[]>();
    mockedFetchCandidates.mockReturnValueOnce(pending.promise);

    renderBrowse();

    expect(screen.getByText("Loading candidates...")).toBeInTheDocument();
  });

  it("renders an empty state when the remote response is empty", async () => {
    mockedFetchCandidates.mockResolvedValueOnce([]);

    renderBrowse();

    expect(
      await screen.findByText("No candidates in this role yet - we are vetting more this week."),
    ).toBeInTheDocument();
  });

  it("renders candidates returned from Supabase", async () => {
    mockedFetchCandidates.mockResolvedValueOnce([
      { id: "550e8400-e29b-41d4-a716-446655440000", name: "Zinhle", role: "Barista", location: "Langa" },
      { id: "550e8400-e29b-41d4-a716-446655440001", name: "Aphiwe", role: "Kitchen", location: null },
    ]);

    renderBrowse();

    expect(await screen.findByText("Zinhle")).toBeInTheDocument();
    expect(screen.getByText("Aphiwe")).toBeInTheDocument();
    expect(screen.queryByText("Ayanda")).not.toBeInTheDocument();
  });

  it("renders an error state without legacy mock candidates when the fetch fails", async () => {
    mockedFetchCandidates.mockRejectedValueOnce(new Error("network down"));

    renderBrowse();

    expect(
      await screen.findByText("We couldn't load verified candidates right now. Please try again in a moment."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Ayanda")).not.toBeInTheDocument();
    expect(screen.queryByText("Nomvula")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Request interview" })).not.toBeInTheDocument();
    });
  });
});
