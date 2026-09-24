import { useEffect, useState } from "react";
import { LungisaProvider } from "@/lungisa/store";
import { Shell } from "@/lungisa/components/Shell";
import { Dashboard } from "@/lungisa/screens/Dashboard";
import { Browse } from "@/lungisa/screens/Browse";
import { Placements } from "@/lungisa/screens/Placements";
import { CandidateDetail, CandidateInterviewBar } from "@/lungisa/screens/CandidateDetail";
import { Activity } from "@/lungisa/screens/Activity";
import { useAuth } from "@/contexts/AuthContext";
import { fetchBusiness, requestCandidateInterview, type Candidate } from "@/lungisa/lib/dashboard";

type Tab = "dashboard" | "browse" | "activity" | "placements";

const Index = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [isTrainingPartner, setIsTrainingPartner] = useState<boolean | null>(null);
  const [openCandidate, setOpenCandidate] = useState<string | null>(null);
  const [openCandidateExists, setOpenCandidateExists] = useState<boolean | null>(null);
  const [openCandidateIsTrainingPartner, setOpenCandidateIsTrainingPartner] = useState(false);
  const [isInterviewRequested, setIsInterviewRequested] = useState(false);

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
    setIsInterviewRequested(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToBrowse = () => {
    setOpenCandidate(null);
    setOpenCandidateExists(null);
    setOpenCandidateIsTrainingPartner(false);
    setIsInterviewRequested(false);
    setTab(isTrainingPartner === true ? "dashboard" : "browse");
  };

  const handleInterviewRequested = async (candidateId: string): Promise<boolean> => {
    if (!user) {
      return false;
    }

    const saved = await requestCandidateInterview(user, candidateId);

    if (saved) {
      setIsInterviewRequested(true);
    }

    return saved;
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
          setIsInterviewRequested(false);
          setTab(nextTab);
        }}
      >
        {openCandidate ? (
          <CandidateDetail
            id={openCandidate}
            isTrainingPartner={openCandidateIsTrainingPartner}
            onInterviewRequestedChange={setIsInterviewRequested}
            onBack={() => {
              setOpenCandidate(null);
              setOpenCandidateExists(null);
              setOpenCandidateIsTrainingPartner(false);
              setIsInterviewRequested(false);
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
          isRequested={isInterviewRequested}
          onInterviewRequested={handleInterviewRequested}
        />
      )}
    </LungisaProvider>
  );
};

export default Index;
