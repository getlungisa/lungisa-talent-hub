import { useState } from "react";
import {
  Activity,
  ClipboardList,
  Heart,
  Info,
  LayoutDashboard,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AboutModal } from "@/lungisa/components/AboutModal";
import { Avatar } from "@/lungisa/components/Avatar";
import { RatingDots } from "@/lungisa/components/RatingDots";
import { VerifiedBadge } from "@/lungisa/components/VerifiedBadge";
import { PlacementRow } from "@/lungisa/components/PlacementRow";
import { candidates } from "@/lungisa/data";

type Version = "latest" | "previous";

// These are identical in both previews so only the dashboard layout changes.
const profiles = [...candidates]
  .filter((candidate) => candidate.verified)
  .sort((a, b) => b.rating - a.rating)
  .slice(0, 4);

function ProfilePreview({ candidate }: { candidate: (typeof profiles)[number] }) {
  const [saved, setSaved] = useState(false);

  return (
    <article className="group flex w-[220px] shrink-0 flex-col rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-2.5">
        <Avatar name={candidate.firstName} />
        <div className="min-w-0">
          <h3 className="break-words font-display text-lg leading-tight text-primary">{candidate.firstName}</h3>
          <p className="text-xs text-muted-foreground">{candidate.role}</p>
        </div>
      </div>
      <div className="mt-3"><VerifiedBadge /></div>
      <div className="mt-3 flex min-h-6 flex-wrap gap-1">
        {candidate.attributes.slice(0, 2).map((attribute) => (
          <span key={attribute.label} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-primary/80">
            {attribute.label}
          </span>
        ))}
      </div>
      <div className="mt-3"><RatingDots value={candidate.rating} label={false} /></div>
      <div className="mt-auto border-t border-border pt-3 text-xs font-medium text-primary">
        <span>View profile</span>
      </div>
      <Button
        variant="ghost"
        onClick={() => setSaved((value) => !value)}
        aria-label={`${saved ? "Remove" : "Save"} ${candidate.firstName} ${saved ? "from" : "to"} shortlist`}
        className={`mt-2 self-center px-2 text-[11px] hover:bg-transparent hover:opacity-70 ${saved ? "text-primary hover:text-primary" : "text-muted-foreground hover:text-muted-foreground"}`}
      >
        <Heart className="h-3.5 w-3.5" fill={saved ? "currentColor" : "none"} />
        {saved ? "Saved to shortlist" : "Save to shortlist"}
      </Button>
    </article>
  );
}

function ProfileRow({ version }: { version: Version }) {
  return (
    <section aria-label="Recommended candidates">
      <p className="mb-3 text-sm text-muted-foreground">Recommended for you</p>
      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="flex gap-4 pb-2">
          {profiles.map((candidate) => <ProfilePreview key={`${version}-${candidate.id}`} candidate={candidate} />)}
        </div>
      </div>
      <p className="mt-2 text-right text-xs text-muted-foreground">See all candidates</p>
    </section>
  );
}

function PreviewDashboard({ version }: { version: Version }) {
  return (
    <div className="space-y-10">
      {version === "latest" ? (
        <section className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-8">
          <div>
            <h2 className="font-display text-3xl text-primary sm:text-4xl">Good morning, Rosetta Roastery</h2>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span><strong className="font-medium text-primary">12 new candidates</strong> verified this week</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="bg-primary px-4 text-primary-foreground hover:bg-primary-hover">I need someone</Button>
            <Button variant="outline" className="border-input text-primary hover:bg-primary-tint">Browse candidates</Button>
          </div>
        </section>
      ) : (
        <section className="flex flex-col items-center pt-4 text-center sm:pt-8">
          <p className="text-sm text-muted-foreground">Good morning</p>
          <h2 className="mt-2 font-display text-4xl text-primary sm:text-5xl">Rosetta Roastery</h2>
          <p className="mt-6 max-w-md font-display text-xl text-primary sm:text-2xl">Tell us who you need. We'll bring them to you.</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
            <Button className="bg-primary px-9 py-5 text-lg text-primary-foreground hover:bg-primary-hover">I need someone</Button>
            <Button variant="outline" className="border-input px-9 py-5 text-lg text-primary hover:bg-primary-tint">Browse candidates</Button>
          </div>
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span><strong className="font-medium text-primary">12 new candidates</strong> verified this week</span>
          </p>
        </section>
      )}

      <ProfileRow version={version} />

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-primary">Active placements</h2>
          <span className="text-sm text-muted-foreground">1 active placement</span>
        </div>
        <PlacementRow name="Sipho" role="Barista" day={12} total={30} startDate="12 days ago" />
      </section>
      <section>
        <h2 className="mb-3 font-display text-2xl text-primary">{version === "latest" ? "Shortlist" : "Your shortlist"}</h2>
        <p className="text-sm text-muted-foreground">Favourite candidates while browsing to save them here.</p>
      </section>
    </div>
  );
}

export default function DashboardCompare() {
  const [version, setVersion] = useState<Version>("latest");
  const [aboutOpen, setAboutOpen] = useState(false);

  const navigation = [
    { label: "Dashboard", icon: LayoutDashboard, active: true },
    { label: "Candidates", icon: Users, active: false },
    { label: "Activity", icon: Activity, active: false },
    { label: "Placements", icon: ClipboardList, active: false },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center px-5 pb-2 pt-4">
          <div className="font-display text-lg font-semibold text-primary">
            Lungisa
          </div>
          <span className="ml-auto hidden text-sm text-muted-foreground sm:block">
            Sample comparison
          </span>
        </div>
        <nav
          className="mx-auto flex max-w-6xl items-stretch px-2 pb-1 sm:items-center sm:gap-1 sm:px-5"
          aria-label="Lungisa navigation"
        >
          <div className="flex min-w-0 flex-1 items-stretch justify-between sm:flex-none sm:items-center sm:gap-8 md:gap-10 lg:w-[70%] lg:justify-between lg:gap-0">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Button
                  key={item.label}
                  type="button"
                  variant="ghost"
                  aria-current={item.active ? "page" : undefined}
                  className={`relative h-auto min-w-0 flex-col gap-1 rounded-none px-1.5 py-2 text-[10px] font-normal hover:bg-transparent sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm ${
                    item.active
                      ? "text-primary hover:text-primary"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.active && (
                    <span className="absolute inset-x-2 -bottom-px h-px bg-primary" />
                  )}
                </Button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAboutOpen(true)}
            className="ml-0 h-auto min-w-0 flex-col gap-1 rounded-none px-1.5 py-2 text-[10px] font-normal text-muted-foreground hover:bg-transparent hover:text-primary sm:ml-auto sm:block sm:px-3 sm:py-2.5 sm:text-sm"
          >
            <Info className="h-4 w-4 sm:hidden" />
            About
          </Button>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8">
        <div className="border-b border-border pb-5">
          <div>
            <h1 className="font-display text-2xl text-primary">Compare dashboard layouts</h1>
            <p className="mt-1 text-sm text-muted-foreground">The same four profiles appear in both versions.</p>
          </div>
          <div className="mt-6 flex w-full border-b border-border" role="tablist" aria-label="Dashboard versions">
            {(["latest", "previous"] as const).map((item) => (
              <Button
                key={item}
                role="tab"
                variant="ghost"
                aria-selected={version === item}
                onClick={() => setVersion(item)}
                className={`h-11 min-w-0 flex-1 border-b-2 px-2 text-sm sm:flex-none sm:px-8 ${version === item ? "border-primary font-semibold text-primary hover:bg-background hover:text-primary" : "border-transparent text-muted-foreground hover:bg-muted hover:text-primary"}`}
              >
                {item === "latest" ? "Latest dashboard" : "Previous dashboard"}
              </Button>
            ))}
          </div>
        </div>
        <PreviewDashboard version={version} />
      </main>
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </div>
  );
}