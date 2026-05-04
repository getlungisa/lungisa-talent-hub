import { createContext, useContext, useMemo, useState, ReactNode } from "react";

type Placement = {
  candidateId: string;
  candidateName: string;
  role: string;
  startedDaysAgo: number;
  totalDays: number;
};

type Store = {
  employerName: string;
  credits: number;
  topUp: (n: number) => void;
  spendCredit: () => boolean;
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
  const [credits, setCredits] = useState(3);
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [interviews, setInterviews] = useState(2);
  const [shortlist, setShortlist] = useState<Set<string>>(new Set(["ayanda"]));

  const value = useMemo<Store>(
    () => ({
      employerName: "Rosetta Roastery",
      credits,
      topUp: (n) => setCredits((c) => c + n),
      spendCredit: () => {
        if (credits <= 0) return false;
        setCredits((c) => c - 1);
        return true;
      },
      requested,
      requestInterview: (id) => {
        if (requested.has(id) || credits <= 0) return false;
        setCredits((c) => c - 1);
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
    [credits, requested, interviews, shortlist]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLungisa() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLungisa must be used inside LungisaProvider");
  return v;
}