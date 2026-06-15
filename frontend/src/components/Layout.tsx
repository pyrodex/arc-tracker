import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, BarChart3, Crosshair } from 'lucide-react';

const navItems = [
  { to: '/',           label: 'Dashboard',   icon: LayoutDashboard, end: true },
  { to: '/characters', label: 'Characters',  icon: Users },
  { to: '/blueprints', label: 'Blueprints',  icon: BookOpen },
  { to: '/reports',    label: 'Reports',     icon: BarChart3 },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-arc-panel border-r border-arc-border">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-arc-border">
          <div className="w-8 h-8 rounded-lg bg-arc-accent/20 border border-arc-accent/40 flex items-center justify-center">
            <Crosshair className="w-4 h-4 text-arc-accent" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">ARC Raiders</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Blueprints</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-arc-accent/15 text-arc-accent border border-arc-accent/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-arc-hover'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-arc-border">
          <p className="text-[10px] text-slate-600 text-center">
            Data: arcraiders.wiki
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
