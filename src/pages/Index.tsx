import { useEffect, useState } from "react";
import { LungisaProvider } from "@/lungisa/store";
import { Shell } from "@/lungisa/components/Shell";
import { Dashboard } from "@/lungisa/screens/Dashboard";
import { Browse } from "@/lungisa/screens/Browse";
import { Placements } from "@/lungisa/screens/Placements";
import { CandidateDetail, CandidateInterviewBar } from "@/lungisa/screens/CandidateDetail";
import { Activity } from "@/lungisa/screens/Activity";
import { useAuth } from "@/contexts/AuthContext";
import { fetchBusiness, type Candidate } from "@/lungisa/lib/dashboard";

type Tab = "dashboard" | "browse" | "activity" | "placements";

const Index = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [isTrainingPartner, setIsTrainingPartner] = useState<boolean | null>(null);
  const [openCandidate, setOpenCandidate] = useState<string | null>(null);
  const [openCandidateExists, setOpenCandidateExists] = useState<boolean | null>(null);
  const [openCandidateIsTrainingPartner, setOpenCandidateIsTrainingPartner] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadBusiness = async () => {
      if (!user) {
        setIsTrainingPartner(false);
        return;
      }

      setIsTrainingPartner(null);

      try {
        const business = await fetchBusiness(user);

        if (!cancelled) {
          setIsTrainingPartner(business?.is_training_partner === true);
        }
      } catch (error) {
        console.error("Failed to load business role:", error);

        if (!cancelled) {
          setIsTrainingPartner(false);
        }
      }
    };

    void loadBusiness();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const activeTab =
    isTrainingPartner !== false && tab !== "dashboard" ? "dashboard" : tab;

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
    setOpenCandidateIsTrainingPartner(false);
    setTab(isTrainingPartner === true ? "dashboard" : "browse");
  };

  return (
    <LungisaProvider>
      <Shell
        active={activeTab}
        isTrainingPartner={isTrainingPartner}
        onNavigate={(t) => {
          const nextTab =
            isTrainingPartner === true && t !== "dashboard" ? "dashboard" : t;

          setOpenCandidate(null);
          setOpenCandidateExists(null);
          setOpenCandidateIsTrainingPartner(false);
          setTab(nextTab);
        }}
      >
        {openCandidate ? (
          <CandidateDetail
            id={openCandidate}
            isTrainingPartner={openCandidateIsTrainingPartner}
            onBack={() => {
              setOpenCandidate(null);
              setOpenCandidateExists(null);
              setOpenCandidateIsTrainingPartner(false);
            }}
            onCandidateStatusChange={setOpenCandidateExists}
          />
        ) : activeTab === "dashboard" ? (
          <Dashboard
            isTrainingPartner={isTrainingPartner}
            onOpenCandidate={goToCandidate}
            onBrowse={goToBrowse}
          />
        ) : activeTab === "browse" ? (
          <Browse onOpenCandidate={goToCandidate} />
        ) : activeTab === "activity" ? (
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
