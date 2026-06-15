import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, BarChart3, ChevronRight, Trophy, Package } from 'lucide-react';
import { useSummary, useCharacters } from '../hooks/useApi';

function ProgressBar({ value, max, color = '#38bdf8' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 bg-arc-border rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const summary = useSummary();
  const characters = useCharacters();

  const hasCharacters = (characters.data?.length ?? 0) > 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-slate-400 text-sm">Track your ARC Raiders blueprint collection across all characters.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<BookOpen className="w-5 h-5 text-arc-accent" />}
          label="Total Blueprints"
          value={summary.data?.totalBlueprints ?? '—'}
          sub="in-game blueprints"
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-purple-400" />}
          label="Characters"
          value={summary.data?.totalCharacters ?? '—'}
          sub="tracked characters"
        />
        <StatCard
          icon={<Package className="w-5 h-5 text-arc-extra" />}
          label="Total Extras"
          value={summary.data?.characters.reduce((s, c) => s + c.total_extras, 0) ?? '—'}
          sub="across all characters"
        />
      </div>

      {/* Quick actions */}
      {!hasCharacters && (
        <div className="card p-6 mb-8 border-dashed text-center">
          <Trophy className="w-8 h-8 text-arc-accent mx-auto mb-3" />
          <p className="text-white font-medium mb-1">No characters yet</p>
          <p className="text-slate-400 text-sm mb-4">Create your first character to start tracking blueprints.</p>
          <button onClick={() => navigate('/characters')} className="btn-primary mx-auto">
            <Users className="w-4 h-4" /> Create Character
          </button>
        </div>
      )}

      {/* Characters progress */}
      {(summary.data?.characters.length ?? 0) > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Character Progress</h2>
            <button onClick={() => navigate('/blueprints')} className="btn-ghost text-xs">
              Track blueprints <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summary.data!.characters.map(char => {
              const pct = char.total_blueprints > 0
                ? Math.round((char.learned_count / char.total_blueprints) * 100)
                : 0;

              return (
                <div
                  key={char.id}
                  className="card p-4 hover:border-slate-600 cursor-pointer transition-colors"
                  onClick={() => navigate('/blueprints')}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: char.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{char.name}</span>
                        {char.label && (
                          <span className="badge bg-arc-border text-slate-400 shrink-0">{char.label}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-white shrink-0">{pct}%</span>
                  </div>

                  <ProgressBar value={char.learned_count} max={char.total_blueprints} color={char.color} />

                  <div className="flex justify-between text-xs text-slate-500 mt-2">
                    <span>{char.learned_count} / {char.total_blueprints} learned</span>
                    {char.total_extras > 0 && (
                      <span className="text-arc-extra">{char.total_extras} extras</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick nav */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QuickNav
          icon={<BookOpen className="w-5 h-5" />}
          title="Track Blueprints"
          desc="View and update learned/extra status per character"
          onClick={() => navigate('/blueprints')}
          color="text-arc-accent"
        />
        <QuickNav
          icon={<BarChart3 className="w-5 h-5" />}
          title="Reports"
          desc="See unlearned blueprints and extras across all characters"
          onClick={() => navigate('/reports')}
          color="text-arc-extra"
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: number | string; sub: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-arc-hover flex items-center justify-center">{icon}</div>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}

function QuickNav({ icon, title, desc, onClick, color }: {
  icon: ReactNode; title: string; desc: string; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="card p-4 text-left hover:border-slate-600 transition-colors group flex items-start gap-3"
    >
      <div className={`mt-0.5 ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 ml-auto mt-0.5 transition-colors" />
    </button>
  );
}
