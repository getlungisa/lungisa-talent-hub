import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type VideoState = {
  path: string;
  url: string | null;
  error: boolean;
};

export function CandidateVideo({ candidate }: { candidate: { video_path?: string | null } }) {
  const path = candidate.video_path;
  const [state, setState] = useState<VideoState | null>(null);

  useEffect(() => {
    if (!path) return;

    let cancelled = false;
    setState(null);

    const loadVideo = async () => {
      try {
        const { data, error } = await supabase.storage
          .from("candidate-videos")
          .createSignedUrl(path, 3600);
        if (error) throw error;
        if (!data?.signedUrl) throw new Error("Missing signed video URL");
        if (!cancelled) setState({ path, url: data.signedUrl, error: false });
      } catch (error) {
        console.error("Failed to load candidate video:", error);
        if (!cancelled) setState({ path, url: null, error: true });
      }
    };

    void loadVideo();
    return () => { cancelled = true; };
  }, [path]);

  if (!path) return null;

  return (
    <div className="demo-blur">
      {state?.path !== path ? (
        <p className="text-sm text-muted-foreground">Loading video...</p>
      ) : state.error ? (
        <p className="text-sm text-muted-foreground">Video isn't available right now</p>
      ) : (
        <div className="max-w-sm overflow-hidden rounded-2xl bg-black">
          <video className="h-auto max-h-[60vh] w-full object-contain" controls playsInline preload="metadata" src={state.url ?? undefined} />
        </div>
      )}
    </div>
  );
}
