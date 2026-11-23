import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CandidateVideo } from "./CandidateVideo";

const { fromMock, createSignedUrlMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  createSignedUrlMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: fromMock } },
}));

describe("CandidateVideo", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fromMock.mockReturnValue({ createSignedUrl: createSignedUrlMock });
  });

  it.each([undefined, null, ""])("renders nothing for an empty path", (video_path) => {
    const { container } = render(<CandidateVideo candidate={{ video_path }} />);
    expect(container).toBeEmptyDOMElement();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("loads a signed URL and renders a blurred video without autoplay", async () => {
    createSignedUrlMock.mockResolvedValue({ data: { signedUrl: "https://example.test/video" }, error: null });
    const { container } = render(<CandidateVideo candidate={{ video_path: "candidate/intro.mp4" }} />);

    expect(screen.getByText("Loading video...")).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector("video")).toBeInTheDocument());
    const video = container.querySelector("video");
    expect(fromMock).toHaveBeenCalledWith("candidate-videos");
    expect(createSignedUrlMock).toHaveBeenCalledWith("candidate/intro.mp4", 3600);
    expect(video).toHaveAttribute("src", "https://example.test/video");
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video).not.toHaveAttribute("autoplay");
    expect(video).toHaveClass("h-auto", "max-h-[60vh]", "w-full", "object-contain");
    expect(video?.parentElement).toHaveClass("max-w-sm", "overflow-hidden", "rounded-2xl", "bg-black");
    expect(video?.closest(".demo-blur")).toBeInTheDocument();
  });

  it.each(["returned error", "rejection"])("shows an error on %s", async (failure) => {
    const error = new Error("unavailable");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    if (failure === "rejection") createSignedUrlMock.mockRejectedValue(error);
    else createSignedUrlMock.mockResolvedValue({ data: null, error });

    render(<CandidateVideo candidate={{ video_path: "intro.mp4" }} />);
    expect(await screen.findByText("Video isn't available right now")).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("does not display an old URL when the path changes", async () => {
    let resolveOld: (value: { data: { signedUrl: string }; error: null }) => void = () => {};
    createSignedUrlMock
      .mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ data: { signedUrl: "https://example.test/new" }, error: null });
    const { container, rerender } = render(<CandidateVideo candidate={{ video_path: "old.mp4" }} />);
    rerender(<CandidateVideo candidate={{ video_path: "new.mp4" }} />);
    await act(async () => { resolveOld({ data: { signedUrl: "https://example.test/old" }, error: null }); });
    expect(container.querySelector("video")).toHaveAttribute("src", "https://example.test/new");
  });
});
