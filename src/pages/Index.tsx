import { useState } from "react";
import { LungisaProvider } from "@/lungisa/store";
import { Shell } from "@/lungisa/components/Shell";
import { Dashboard } from "@/lungisa/screens/Dashboard";
import { Browse } from "@/lungisa/screens/Browse";
import { Placements } from "@/lungisa/screens/Placements";
import { CandidateDetail } from "@/lungisa/screens/CandidateDetail";

type Tab = "dashboard" | "browse" | "placements";

const Index = () => {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [openCandidate, setOpenCandidate] = useState<string | null>(null);

  const goToCandidate = (id: string) => {
    setOpenCandidate(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToBrowse = () => {
    setOpenCandidate(null);
    setTab("browse");
  };

  return (
    <LungisaProvider>
      <Shell
        active={tab}
        onNavigate={(t) => {
          setOpenCandidate(null);
          setTab(t);
        }}
      >
        {openCandidate ? (
          <CandidateDetail id={openCandidate} onBack={() => setOpenCandidate(null)} />
        ) : tab === "dashboard" ? (
          <Dashboard onOpenCandidate={goToCandidate} onBrowse={goToBrowse} />
        ) : tab === "browse" ? (
          <Browse onOpenCandidate={goToCandidate} />
        ) : (
          <Placements />
        )}
      </Shell>
    </LungisaProvider>
  );
};

export default Index;
