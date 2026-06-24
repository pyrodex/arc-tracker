import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, BarChart3 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../hooks/useTheme';

const navItems = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/characters', label: 'Characters', icon: Users },
  { to: '/blueprints', label: 'Blueprints', icon: BookOpen },
  { to: '/reports',    label: 'Reports',    icon: BarChart3 },
];

function ArcRaidersLogo() {
  return (
    <img src="/arc-icon.png" alt="ARC Raiders" className="w-9 h-9 rounded-sm" />
  );
}

export default function Layout() {
  const { mode, setMode } = useTheme();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-arc-panel border-r border-arc-border sticky top-0 h-screen">

        {/* Logo / Brand */}
        <div className="px-4 py-5 border-b border-arc-border">
          <div className="flex items-center gap-3">
            <ArcRaidersLogo />
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-widest uppercase text-arc-accent leading-tight">
                ARC Raiders
              </p>
              <p className="text-[11px] text-arc-muted leading-tight mt-0.5">
                Blueprint Tracker
              </p>
            </div>
          </div>

          {/* Decorative scan-line */}
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-arc-accent/40 to-transparent" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-arc-accent/12 text-arc-accent border border-arc-accent/25 shadow-[0_0_12px_rgb(var(--arc-accent)/0.08)]'
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
        </nav>

        {/* Footer */}
        <div className="px-4 pb-4 space-y-3 border-t border-arc-border pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-arc-dim uppercase tracking-wider">Theme</span>
            <ThemeToggle mode={mode} setMode={setMode} />
          </div>
          <p className="text-[10px] text-arc-dim text-center">
            Data: <a
              href="https://arcraiders.wiki/wiki/Blueprints"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-arc-accent transition-colors"
            >arcraiders.wiki</a>
          </p>
          <p className="text-[10px] text-arc-dim/50 text-center tabular-nums">
            v{__APP_VERSION__}
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0 bg-arc-bg animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
