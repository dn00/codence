import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { getLearnspaces, switchLearnspace, type LearnspaceListItem } from "../lib/api";

export interface AppShellProps {
  children: React.ReactNode;
  learnspaceName?: string;
  headerRight?: React.ReactNode;
  breadcrumb?: string;
  hideLearnspaceSwitcher?: boolean;
}

function readCachedLearnspaceName(): string | null {
  if (typeof window === "undefined") return null;
  const storage = window.localStorage;
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    return storage.getItem("last_learnspace_name");
  } catch {
    return null;
  }
}

function writeCachedLearnspaceName(name: string): void {
  if (typeof window === "undefined") return;
  const storage = window.localStorage;
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem("last_learnspace_name", name);
  } catch {
    // Ignore storage failures; this cache is purely cosmetic.
  }
}

export function AppShell({ children, learnspaceName, headerRight, breadcrumb, hideLearnspaceSwitcher }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const onPracticePage = location.pathname.startsWith("/practice/");
  const [showGuide, setShowGuide] = useState(false);
  const [allLearnspaces, setAllLearnspaces] = useState<LearnspaceListItem[]>([]);
  const [activeLearnspaceId, setActiveLearnspaceId] = useState<string>("");
  const [switching, setSwitching] = useState(false);

  // Optimistic UI: Cache the learnspace name to prevent flickering during router navigations
  const displayLearnspaceName = learnspaceName || readCachedLearnspaceName();
  useEffect(() => {
    if (learnspaceName && learnspaceName !== readCachedLearnspaceName()) {
      writeCachedLearnspaceName(learnspaceName);
    }
  }, [learnspaceName]);

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/progress", label: "Progress" },
    { to: "/library", label: "Library" },
    { to: "/settings", label: "Settings" },
  ];

  useEffect(() => {
    getLearnspaces()
      .then((data) => {
        setAllLearnspaces(Array.isArray(data.learnspaces) ? data.learnspaces : []);
        setActiveLearnspaceId(typeof data.activeId === "string" ? data.activeId : "");
      })
      .catch(() => {});
  }, []);

  async function handleSwitch(id: string) {
    if (id === activeLearnspaceId || switching) return;
    setSwitching(true);
    try {
      await switchLearnspace(id);
      setActiveLearnspaceId(id);
      navigate("/");
      window.location.reload();
    } catch {
      setSwitching(false);
    }
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className={`w-full flex items-center justify-between py-3 ${!onPracticePage ? "max-w-7xl mx-auto px-6 xl:px-10" : "px-6"}`}>
          <div className="flex items-center gap-6 min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0 shrink-0">
              <button
                onClick={() => navigate("/")}
                className="font-mono text-xl font-bold tracking-wider uppercase text-foreground hover:text-primary transition-colors shrink-0"
              >
                Codence
              </button>
              {displayLearnspaceName && (
                <>
                  <span className="text-muted-foreground/30 shrink-0 font-light">/</span>
                  <button
                    onClick={() => navigate("/")}
                    className="font-sans text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors truncate"
                  >
                    {displayLearnspaceName}
                  </button>
                </>
              )}
              {breadcrumb && (
                <>
                  <span className="text-muted-foreground/30 shrink-0 font-light">/</span>
                  <span className="font-sans text-sm font-semibold text-foreground truncate">{breadcrumb}</span>
                </>
              )}
            </div>

            {/* Desktop Nav */}
            {!onPracticePage && (
              <nav className="hidden md:flex items-center gap-1 border-l border-border pl-6" aria-label="Primary">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      `font-sans text-sm font-bold tracking-tight px-3 py-1.5 rounded-[2px] transition-all ${
                        isActive
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {allLearnspaces.length > 0 && !onPracticePage && !hideLearnspaceSwitcher && (
              <select
                value={activeLearnspaceId}
                onChange={(e) => handleSwitch(e.target.value)}
                disabled={switching}
                className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-background border border-border rounded-[2px] px-3 py-1.5 cursor-pointer hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition-all"
                title="Active learnspace"
              >
                {allLearnspaces.map((ls) => (
                  <option key={ls.id} value={ls.id}>{ls.name}</option>
                ))}
                <option disabled value="__future__">+ Learnspace (future)</option>
              </select>
            )}
            {!onPracticePage && (
              <button
                onClick={() => setShowGuide(true)}
                className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border rounded-[2px] px-3 py-1.5 hover:bg-muted/50 transition-all"
              >
                How It Works
              </button>
            )}
            {headerRight}
          </div>
        </div>

        {/* Mobile Nav */}
        {!onPracticePage && (
          <div className={`md:hidden overflow-x-auto border-t border-border/50 bg-muted/10`}>
            <nav className={`flex items-center gap-2 px-6 py-2 scrollbar-hide max-w-7xl mx-auto`} aria-label="Primary">
               {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      `font-sans text-sm font-bold tracking-tight px-3 py-1.5 rounded-[2px] transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
            </nav>
          </div>
        )}
      </header>
      <div className="flex-1 min-h-0 flex flex-col">
        {children}
      </div>

      {/* Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={() => setShowGuide(false)}>
          <div className="bg-card border-2 border-border shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="font-sans text-lg font-bold text-foreground">How It Works</h2>
              <button onClick={() => setShowGuide(false)} className="font-mono text-xs font-bold text-muted-foreground hover:text-foreground border border-border rounded-[2px] px-2 py-1 hover:bg-muted/50 transition-all">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-6">
              <div className="bg-primary/5 border border-primary/20 rounded-[2px] p-4 space-y-2">
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">AI Coach</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  An AI coach is available at every step via the side panel (<span className="font-mono text-[10px]">&#8984;K</span>). It won't give you answers — it asks questions, points out gaps, and pushes for precision. The coach sees your work at each step and adapts its guidance to your skill level.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When you submit, the coach evaluates your entire attempt: did you solve it independently (<span className="font-bold text-success">clean</span>), with significant guidance (<span className="font-bold text-accent-orange">assisted</span>), or did you need the answer (<span className="font-bold text-destructive">failed</span>)? This outcome drives when the problem resurfaces in your review queue.
                </p>
              </div>

              <div className="bg-muted/30 border border-border-light rounded-[2px] p-4 space-y-2">
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Spaced Repetition</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Problems resurface based on confidence scores. A <span className="font-bold text-success">clean solve</span> pushes the next review further out.
                  An <span className="font-bold text-accent-orange">assisted</span> or <span className="font-bold text-destructive">failed</span> attempt keeps it close.
                  The AI coach evaluates each attempt — asking for hints counts as assistance.
                </p>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Each problem follows a structured solve protocol. The steps build genuine problem-solving skill — not memorization.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border-light rounded-[2px] p-4 space-y-1">
                  <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">1. Understanding</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">Restate the problem. Identify inputs, outputs, constraints, and edge cases. Derive target complexity from constraints (e.g., n &le; 10&#8309; &rarr; O(n log n) or better).</p>
                </div>
                <div className="border border-border-light rounded-[2px] p-4 space-y-1">
                  <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">2. Approach</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">State brute force in one sentence, then name your optimal pattern and explain why it fits this problem's structure.</p>
                </div>
                <div className="border border-border-light rounded-[2px] p-4 space-y-1">
                  <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">3. Key Insight</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">State the invariant — not the pattern name, but the reason it works. "The stack holds unresolved indices in decreasing order" is an invariant. "Use a stack" is not.</p>
                </div>
                <div className="border border-border-light rounded-[2px] p-4 space-y-1">
                  <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">4. Walkthrough</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">Trace through a concrete example step by step. Show ALL state (pointers, data structures, variables) at each step. Then trace an edge case.</p>
                </div>
                <div className="border border-border-light rounded-[2px] p-4 space-y-1">
                  <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">5. Code</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">Implement your solution. By this point you should know exactly what to write — the trace is your blueprint.</p>
                </div>
                <div className="border border-border-light rounded-[2px] p-4 space-y-1">
                  <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">6. Verify</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">State time and space complexity. Mentally dry-run at least one edge case through your code. Check for off-by-one errors.</p>
                </div>
                <div className="border border-border-light rounded-[2px] p-4 space-y-1 md:col-span-2">
                  <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">7. Reflect</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">What went well? What was hard? What's your future cue — the signal you'd notice next time to recognize the pattern faster or avoid a mistake?</p>
                </div>
              </div>

              <div className="border-t border-border-light pt-4 space-y-2">
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Session Modes</h4>
                <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                  <p><span className="font-bold text-foreground">Recommended</span> — The queue picks what's ready based on spaced repetition. Easy warm-up first within each urgency tier.</p>
                  <p><span className="font-bold text-foreground">Explore New Skill</span> — Unattempted problems, easy first. Good for learning new patterns.</p>
                  <p><span className="font-bold text-foreground">Weakest Pattern</span> — Start with your lowest-confidence skills, easy first to rebuild.</p>
                  <p><span className="font-bold text-foreground">Foundations</span> — Easier problems from your strongest patterns. Good for easing back in after time away.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
