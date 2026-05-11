import { ReactNode } from "react";
import { useLungisa } from "../store";
import { CreditsChip } from "./CreditsChip";
import { Coffee, LayoutDashboard, Users, Activity, ClipboardList, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export type Tab = "dashboard" | "browse" | "activity" | "placements";

export function Shell({
  active,
  onNavigate,
  children,
}: {
  active: Tab;
  onNavigate: (tab: Tab) => void;
  children: ReactNode;
}) {
  const { employerName } = useLungisa();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/sign-in", { replace: true });
  };

  const navItems: { id: Tab; label: string; icon: typeof Coffee }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "browse", label: "Candidates", icon: Users },
    { id: "activity", label: "Activity", icon: Activity },
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

          <div className="flex items-center gap-2">
            <CreditsChip />
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-accent hover:text-accent"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-1 sm:px-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm transition ${
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
    </div>
  );
}
