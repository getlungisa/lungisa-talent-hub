import { ReactNode, useState } from "react";
import { useLungisa } from "../store";
import { TopUpModal } from "./TopUpModal";
import { Coffee, LayoutDashboard, Users, ClipboardList, Plus } from "lucide-react";

type Tab = "dashboard" | "browse" | "placements";

export function Shell({
  active,
  onNavigate,
  children,
}: {
  active: Tab;
  onNavigate: (tab: Tab) => void;
  children: ReactNode;
}) {
  const { credits, employerName } = useLungisa();
  const [topUpOpen, setTopUpOpen] = useState(false);

  const navItems: { id: Tab; label: string; icon: typeof Coffee }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "browse", label: "Candidates", icon: Users },
    { id: "placements", label: "Placements", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Coffee className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg text-primary">Lungisa</div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {employerName}
              </div>
            </div>
          </div>

          <button
            onClick={() => setTopUpOpen(true)}
            className="hidden items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-primary transition hover:border-accent hover:text-accent sm:inline-flex"
          >
            <span className="font-medium">{credits}</span>
            <span className="text-muted-foreground">credits</span>
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Plus className="h-3 w-3" strokeWidth={2.5} />
            </span>
          </button>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 px-3 pb-1 sm:px-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative flex items-center gap-2 px-3 py-2.5 text-sm transition ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {isActive && <span className="absolute inset-x-2 -bottom-px h-px bg-accent" />}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:pt-10">{children}</main>

      <TopUpModal open={topUpOpen} onOpenChange={setTopUpOpen} />
    </div>
  );
}