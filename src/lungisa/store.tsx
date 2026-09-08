import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchBusinessName } from "./lib/needs";

type Placement = {
  candidateId: string;
  candidateName: string;
  role: string;
  startedDaysAgo: number;
  totalDays: number;
};

type Store = {
  employerName: string;
  requested: Set<string>;
  requestInterview: (id: string) => boolean;
  shortlist: Set<string>;
  toggleShortlist: (id: string) => void;
  newThisWeek: number;
  stats: { browsed: number; interviews: number; placements: number };
  placements: Placement[];
};

const Ctx = createContext<Store | null>(null);

export function LungisaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [employerName, setEmployerName] = useState("Loading...");
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [interviews, setInterviews] = useState(2);
  const [shortlist, setShortlist] = useState<Set<string>>(new Set(["ayanda"]));

  useEffect(() => {
    if (!user) {
      setEmployerName("Unknown Business");
      return;
    }

    const loadBusinessName = async () => {
      try {
        const name = await fetchBusinessName(user);
        setEmployerName(name);
      } catch (err) {
        console.error("Failed to load business name:", err);
        setEmployerName("Business");
      }
    };

    loadBusinessName();
  }, [user?.id]);

  const value = useMemo<Store>(
    () => ({
      employerName,
      requested,
      requestInterview: (id) => {
        if (requested.has(id)) return false;
        setInterviews((i) => i + 1);
        setRequested((r) => new Set(r).add(id));
        return true;
      },
      shortlist,
      toggleShortlist: (id) =>
        setShortlist((s) => {
          const next = new Set(s);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      newThisWeek: 12,
      stats: { browsed: 14, interviews, placements: 1 },
      placements: [
        {
          candidateId: "sipho",
          candidateName: "Sipho",
          role: "Barista",
          startedDaysAgo: 12,
          totalDays: 30,
        },
      ],
    }),
    [employerName, requested, interviews, shortlist]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLungisa() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLungisa must be used inside LungisaProvider");
  return v;
}
