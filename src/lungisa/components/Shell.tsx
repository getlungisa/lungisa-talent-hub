import { ReactNode, useState } from "react";
import { useLungisa } from "../store";
import {
  Activity,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import { AboutModal } from "./AboutModal";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Tab = "dashboard" | "browse" | "activity" | "placements";

export function Shell({
  active,
  isTrainingPartner,
  onNavigate,
  children,
}: {
  active: Tab;
  isTrainingPartner: boolean | null;
  onNavigate: (tab: Tab) => void;
  children: ReactNode;
}) {
  const { employerName } = useLungisa();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/sign-in", { replace: true });
  };

  const navItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "browse", label: "Candidates", icon: Users },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "placements", label: "Placements", icon: ClipboardList },
  ];
  const visibleNavItems =
    isTrainingPartner === false
      ? navItems
      : navItems.filter((item) => item.id === "dashboard");
  const primaryNavGroupClassName = [
    "flex items-center gap-4 sm:gap-8 md:gap-10",
    visibleNavItems.length > 1 && "lg:w-[70%] lg:justify-between lg:gap-0",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center px-5 pt-4 pb-2">
          <div className="font-display text-lg font-semibold text-primary">
            Lungisa
          </div>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-2 border border-input bg-card px-3 text-sm font-medium text-primary transition hover:bg-primary-tint">
                  {employerName}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void handleSignOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

       <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-3 pb-1 sm:px-5">
         <div
           data-testid="primary-nav-group"
           className={primaryNavGroupClassName}
         >
           {visibleNavItems.map((item) => {
             const Icon = item.icon;
             const isActive = active === item.id;

             return (
               <button
                 key={item.id}
                 onClick={() => onNavigate(item.id)}
                 className={`relative flex items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm transition ${
                   isActive
                     ? "text-primary"
                     : "text-muted-foreground hover:text-primary"
                 }`}
               >
                 <Icon className="h-4 w-4" />
                 <span>{item.label}</span>

                 {isActive && (
                   <span className="absolute inset-x-2 -bottom-px h-px bg-primary" />
                 )}
               </button>
             );
           })}
         </div>

         <button
           onClick={() => setAboutOpen(true)}
           className="ml-auto whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground transition hover:text-primary"
         >
           About
         </button>
       </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:pt-10">
        {children}
      </main>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </div>
  );
}
