import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, ChevronRight, Trophy, Cpu, Crosshair, SprayCan, Zap } from 'lucide-react';
import { useSummary, useCharacters } from '../hooks/useApi';
import { useActiveCharacter } from '../hooks/useActiveCharacter';
import WhatsNext from '../components/WhatsNext';

function ProgressBar({ value, max, color = 'rgb(var(--arc-accent))' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 bg-arc-border rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function LabelPills({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {label.split(',').map(l => l.trim()).filter(Boolean).map(l => (
        <span key={l} className="badge bg-arc-border/60 text-arc-muted text-xs">{l}</span>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeCharId, setActiveCharId } = useActiveCharacter();
  const summary    = useSummary();
  const characters = useCharacters();
  const hasCharacters = (characters.data?.length ?? 0) > 0;

  // Loadout totals ride along on the summary payload, so the Dashboard still
  // makes a single call.
  const chars = summary.data?.characters;
  const totalGuns = chars?.reduce((s, c) => s + c.total_guns, 0);
  const totalBuilds = chars?.reduce((s, c) => s + c.config_count, 0) ?? 0;
  const totalLoadoutValue = chars?.reduce((s, c) => s + c.loadout_value, 0) ?? 0;
  const totalStencilsLearned = chars?.reduce((s, c) => s + c.stencils_learned, 0) ?? 0;
  const totalStencilExtras = chars?.reduce((s, c) => s + c.stencil_extras, 0) ?? 0;
  const totalBlueprintExtras = chars?.reduce((s, c) => s + c.total_extras, 0) ?? 0;
  const totalAmplification = chars?.reduce((s, c) => s + c.total_amplification, 0);
  const totalAmpModules = chars?.reduce((s, c) => s + c.amplification_modules, 0) ?? 0;
  const totalAmpValue = chars?.reduce((s, c) => s + c.amplification_value, 0) ?? 0;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-arc-text mb-1">Dashboard</h1>
        <p className="text-arc-muted text-sm">Track blueprints, stencils, ARC parts, amplification and gun builds across all your characters.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<BookOpen className="w-5 h-5 text-arc-accent" />}
          label="Blueprints"
          value={summary.data?.totalBlueprints ?? '—'}
          sub={totalBlueprintExtras
            ? `in-game · ${totalBlueprintExtras} extra${totalBlueprintExtras === 1 ? '' : 's'} held`
            : 'in-game blueprints'}
        />
        <StatCard
          icon={<SprayCan className="w-5 h-5 text-fuchsia-400" />}
          label="Stencils"
          value={summary.data?.totalStencils ?? '—'}
          sub={totalStencilsLearned || totalStencilExtras
            ? `${totalStencilsLearned} learned · ${totalStencilExtras} extra${totalStencilExtras === 1 ? '' : 's'}`
            : 'in-game stencils'}
        />
        <StatCard icon={<Users    className="w-5 h-5 text-purple-400" />} label="Characters"      value={summary.data?.totalCharacters ?? '—'} sub="tracked characters" />
        <StatCard icon={<Cpu      className="w-5 h-5 text-purple-400" />} label="ARC Parts"        value={summary.data?.characters.reduce((s, c) => s + c.total_arc_parts, 0) ?? '—'} sub="collected across all characters" />
        <StatCard
          icon={<Zap className="w-5 h-5 text-amber-400" />}
          label="Amplification"
          value={totalAmplification ?? '—'}
          sub={totalAmplification
            ? `${totalAmpModules} module${totalAmpModules === 1 ? '' : 's'} · ${totalAmpValue.toLocaleString()} value`
            : 'modules and materials held'}
        />
        <StatCard
          icon={<Crosshair className="w-5 h-5 text-sky-400" />}
          label="Guns"
          value={totalGuns ?? '—'}
          sub={totalBuilds ? `${totalBuilds} build${totalBuilds === 1 ? '' : 's'} · ${totalLoadoutValue.toLocaleString()} value` : 'no builds yet'}
        />
      </div>

      {/* Empty state */}
      {!hasCharacters && (
        <div className="card p-8 mb-8 border-dashed text-center">
          <Trophy className="w-8 h-8 text-arc-accent mx-auto mb-3" />
          <p className="text-arc-text font-medium mb-1">No characters yet</p>
          <p className="text-arc-muted text-sm mb-4">Create your first character to start tracking.</p>
          <button onClick={() => navigate('/characters')} className="btn-primary mx-auto">
            <Users className="w-4 h-4" /> Create Character
          </button>
        </div>
      )}

      {/* Character progress */}
      {(summary.data?.characters.length ?? 0) > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-arc-text">Character Progress</h2>
            <button onClick={() => navigate('/blueprints')} className="btn-ghost text-xs">
              Track blueprints <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summary.data!.characters.map(char => {
              const pct = char.total_blueprints > 0
                ? Math.round((char.learned_count / char.total_blueprints) * 100) : 0;

              return (
                <button
                  key={char.id}
                  type="button"
                  className={`card p-4 text-left hover:border-arc-muted/40 transition-colors ${char.id === activeCharId ? 'ring-1 ring-arc-accent/40' : ''}`}
                  onClick={() => { setActiveCharId(char.id); navigate('/blueprints'); }}
                  title={`Switch to ${char.name} and open Blueprints`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: char.color }} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-arc-text truncate">{char.name}</span>
                        <span className="text-sm font-bold text-arc-text shrink-0">{pct}%</span>
                      </div>
                      <LabelPills label={char.label} />
                    </div>
                  </div>

                  <ProgressBar value={char.learned_count} max={char.total_blueprints} color={char.color} />

                  <div className="flex justify-between text-xs text-arc-dim mt-2">
                    <span>
                      {char.learned_count} / {char.total_blueprints} learned
                      {char.total_stencils > 0 && (
                        <span className="text-fuchsia-400" title={`${char.stencil_extras} spare stencil${char.stencil_extras === 1 ? '' : 's'}`}>
                          {' · '}{char.stencils_learned} / {char.total_stencils} stencils
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {char.total_extras > 0 && <span className="text-arc-extra">{char.total_extras} extras</span>}
                      {char.total_arc_parts > 0 && <span className="text-purple-400">{char.total_arc_parts} ARC parts</span>}
                      {char.total_amplification > 0 && (
                        <span className="text-amber-400" title={`${char.amplification_modules} module${char.amplification_modules === 1 ? '' : 's'} · ${char.amplification_value.toLocaleString()} value`}>
                          {char.total_amplification} amp
                        </span>
                      )}
                      {char.total_guns > 0 && (
                        <span className="text-sky-400" title={`${char.config_count} build${char.config_count === 1 ? '' : 's'} · ${char.loadout_value.toLocaleString()} value`}>
                          {char.total_guns} gun{char.total_guns === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <WhatsNext />
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: number | string; sub: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-arc-hover flex items-center justify-center">{icon}</div>
        <span className="text-sm text-arc-muted">{label}</span>
      </div>
      <p className="text-3xl font-bold text-arc-text">{value}</p>
      <p className="text-xs text-arc-dim mt-0.5">{sub}</p>
    </div>
  );
}
