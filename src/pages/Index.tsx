import { useState } from "react";
import { LungisaProvider } from "@/lungisa/store";
import { Shell } from "@/lungisa/components/Shell";
import { Dashboard } from "@/lungisa/screens/Dashboard";
import { Browse } from "@/lungisa/screens/Browse";
import { Placements } from "@/lungisa/screens/Placements";
import { CandidateDetail, CandidateInterviewBar } from "@/lungisa/screens/CandidateDetail";
import { Activity } from "@/lungisa/screens/Activity";
import type { Candidate } from "@/lungisa/lib/dashboard";

type Tab = "dashboard" | "browse" | "activity" | "placements";

const Index = () => {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [openCandidate, setOpenCandidate] = useState<string | null>(null);
  const [openCandidateExists, setOpenCandidateExists] = useState<boolean | null>(null);
  const [openCandidateIsTrainingPartner, setOpenCandidateIsTrainingPartner] = useState(false);

  const goToCandidate = (candidate: Candidate | string, isTrainingPartner = false) => {
    const id = typeof candidate === "string" ? candidate : candidate.id;
    setOpenCandidate(id);
    setOpenCandidateExists(null);
    setOpenCandidateIsTrainingPartner(isTrainingPartner);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToBrowse = () => {
    setOpenCandidate(null);
    setOpenCandidateExists(null);
    setTab("browse");
  };

  return (
    <LungisaProvider>
<Shell
  active={tab}
  onNavigate={(t) => {
    setOpenCandidate(null);
    setOpenCandidateExists(null);
    setOpenCandidateIsTrainingPartner(false);
    setTab(t);
  }}
>
        {openCandidate ? (
          <CandidateDetail
            id={openCandidate}
            onBack={() => {
              setOpenCandidate(null);
              setOpenCandidateExists(null);
            }}
            onCandidateStatusChange={setOpenCandidateExists}
          />
        ) : tab === "dashboard" ? (
          <Dashboard onOpenCandidate={goToCandidate} onBrowse={goToBrowse} />
        ) : tab === "browse" ? (
          <Browse onOpenCandidate={goToCandidate} />
        ) : tab === "activity" ? (
          <Activity />
        ) : (
          <Placements />
        )}
      </Shell>
           {openCandidate && (
        <CandidateInterviewBar
          id={openCandidate}
          candidateExists={openCandidateExists}
          isTrainingPartner={openCandidateIsTrainingPartner}
        />
      )}
    </LungisaProvider>
  );
};

export default Index;
