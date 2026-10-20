import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, BarChart3, Cpu, Wrench, Crosshair, SprayCan, Zap, Menu, X, Search } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Toaster from './Toaster';
import QuickEntry, { openQuickEntry } from './QuickEntry';
import { useTheme } from '../hooks/useTheme';
import { ActiveCharacterProvider } from '../hooks/useActiveCharacter';

const navItems = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/characters', label: 'Characters', icon: Users },
  { to: '/blueprints', label: 'Blueprints', icon: BookOpen },
  { to: '/stencils',   label: 'Stencils',   icon: SprayCan },
  { to: '/arc-parts',  label: 'ARC Parts',  icon: Cpu },
  { to: '/amplification', label: 'Amplification', icon: Zap },
  { to: '/workshop',   label: 'Workshop',   icon: Wrench },
  { to: '/loadouts',   label: 'Loadouts',   icon: Crosshair },
  { to: '/reports',    label: 'Reports',    icon: BarChart3 },
];

const SHORTCUT = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K';

function ArcRaidersLogo() {
  return (
    <img src="/arc-icon.png" alt="ARC Raiders" className="w-9 h-9 rounded-xs" />
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <ArcRaidersLogo />
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-widest uppercase text-arc-accent leading-tight">
          ARC Raiders
        </p>
        <p className="text-xs text-arc-muted leading-tight mt-0.5">
          Tracker
        </p>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { mode, setMode } = useTheme();
  return (
    <>
      {/* Logo / Brand */}
      <div className="px-4 py-5 border-b border-arc-border">
        <Brand />
        {/* Decorative scan-line */}
        <div className="mt-4 h-px bg-linear-to-r from-transparent via-arc-accent/40 to-transparent" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
              ${isActive
                ? 'text-arc-accent border border-arc-accent/25 shadow-[0_0_12px_rgb(var(--arc-accent)/0.08)]'
                : 'text-arc-muted hover:text-arc-text hover:bg-arc-hover border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`relative flex items-center justify-center w-7 h-7 rounded-md transition-colors
                  ${isActive ? 'bg-arc-accent/20' : 'bg-arc-border/40 group-hover:bg-arc-hover'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {isActive && (
                    <span className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 rounded-full bg-arc-accent" />
                  )}
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={() => { onNavigate?.(); openQuickEntry(); }}
          className="w-full mt-3 flex items-center gap-3 px-3 py-2 rounded-lg text-sm whitespace-nowrap text-arc-muted hover:text-arc-text hover:bg-arc-hover border border-dashed border-arc-border"
          title={`Find any item and set its count (${SHORTCUT} or /)`}
        >
          <span className="w-7 flex justify-center"><Search className="w-3.5 h-3.5" /></span>
          Quick entry
          <kbd className="ml-auto text-[11px] font-mono text-arc-dim border border-arc-border rounded px-1 py-px">{SHORTCUT}</kbd>
        </button>
      </nav>

      {/* Footer */}
      <div className="px-4 pb-4 space-y-3 border-t border-arc-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-arc-dim uppercase tracking-wider">Theme</span>
          <ThemeToggle mode={mode} setMode={setMode} />
        </div>
        <p className="text-xs text-arc-dim text-center">
          <a
            href="https://github.com/pyrodex/arc-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-arc-accent transition-colors"
          >GitHub Project</a>
        </p>
        <p className="text-xs text-arc-dim text-center tabular-nums">
          v{__APP_VERSION__}
        </p>
      </div>
    </>
  );
}

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu whenever the page changes.
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <ActiveCharacterProvider>
      <div className="flex h-dvh">
        {/* Sidebar — fixed column from md up */}
        <aside className="hidden md:flex w-56 shrink-0 flex-col bg-arc-panel border-r border-arc-border h-dvh">
          <SidebarContent />
        </aside>

        {/* Sidebar — slide-over drawer below md */}
        {drawerOpen && (
          <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 max-w-[85vw] flex flex-col bg-arc-panel border-r border-arc-border shadow-2xl animate-fade-in">
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute right-2 top-2 btn-ghost p-2"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top bar — small screens only */}
          <header className="md:hidden flex items-center gap-3 px-3 h-14 shrink-0 bg-arc-panel border-b border-arc-border">
            <button onClick={() => setDrawerOpen(true)} className="btn-ghost p-2" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <Brand />
            <button onClick={openQuickEntry} className="btn-ghost p-2 ml-auto" aria-label="Quick entry">
              <Search className="w-5 h-5" />
            </button>
          </header>

          {/* Main content */}
          <main className="flex-1 min-h-0 overflow-auto bg-arc-bg animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
      <QuickEntry />
      <Toaster />
    </ActiveCharacterProvider>
  );
}
