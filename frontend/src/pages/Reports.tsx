import { useState } from 'react';
import { BarChart3, AlertCircle, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { useUnlearnedReport, useExtrasReport, useCharacters } from '../hooks/useApi';
import type { UnlearnedBlueprint, ExtrasReport, CharacterLearnStatus } from '../types';
import { CategoryBadge } from '../components/CategoryIcon';
import BlueprintIcon from '../components/BlueprintIcon';

type ReportTab = 'unlearned' | 'extras';

export default function Reports() {
  const [tab, setTab] = useState<ReportTab>('unlearned');

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-arc-text mb-1">Reports</h1>
        <p className="text-arc-muted text-sm">Analyze blueprint collection gaps and extras across all characters.</p>
      </div>

      <div className="flex gap-1 p-1 bg-arc-panel rounded-lg w-fit mb-6 border border-arc-border">
        {([
          { id: 'unlearned', label: 'Unlearned Blueprints', icon: AlertCircle },
          { id: 'extras',    label: 'Extras Inventory',     icon: Package },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${tab === id ? 'bg-arc-card text-arc-text border border-arc-border' : 'text-arc-muted hover:text-arc-text'}`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'unlearned' && <UnlearnedReport />}
      {tab === 'extras'    && <ExtrasInventory />}
    </div>
  );
}

function UnlearnedReport() {
  const { data, isLoading } = useUnlearnedReport();
  const { data: characters = [] } = useCharacters();

  if (isLoading) return <LoadingState />;
  if (!data || characters.length === 0) return <EmptyState message="No characters or blueprints found." />;
  if (data.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <p className="text-arc-text font-semibold">All blueprints learned!</p>
        <p className="text-arc-muted text-sm mt-1">Every blueprint has been learned by all characters.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-arc-muted mb-4">
        <span className="text-arc-text font-semibold">{data.length}</span> blueprint{data.length !== 1 ? 's' : ''} not learned by at least one character.
      </p>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-arc-border">
                <th className="text-left px-4 py-3 text-xs text-arc-muted font-medium uppercase tracking-wide">Blueprint</th>
                <th className="text-left px-4 py-3 text-xs text-arc-muted font-medium uppercase tracking-wide hidden md:table-cell">Category</th>
                {characters.map(c => (
                  <th key={c.id} className="text-center px-2 py-3 text-xs font-medium uppercase tracking-wide min-w-[80px]">
                    <span style={{ color: c.color }} className="truncate block max-w-[80px] mx-auto">{c.name}</span>
                  </th>
                ))}
                <th className="text-center px-2 py-3 text-xs text-arc-muted font-medium uppercase tracking-wide">Missing</th>
              </tr>
            </thead>
            <tbody>
              {data.map((bp: UnlearnedBlueprint) => (
                <tr key={bp.id} className="border-b border-arc-border/40 hover:bg-arc-hover/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <BlueprintIcon slug={bp.slug} name={bp.name} category={bp.category} size={24} />
                      <span className="text-arc-text font-medium">{bp.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell"><CategoryBadge category={bp.category} /></td>
                  {(bp.characters as CharacterLearnStatus[]).map(cs => (
                    <td key={cs.character_id} className="text-center px-2 py-2.5">
                      {cs.learned
                        ? <span className="text-arc-learned text-base">✓</span>
                        : <span className="text-arc-danger/70 text-base">✗</span>
                      }
                    </td>
                  ))}
                  <td className="text-center px-2 py-2.5">
                    <span className={`badge ${
                      bp.unlearned_count === characters.length
                        ? 'bg-arc-danger/15 text-arc-danger border border-arc-danger/30'
                        : 'bg-arc-extra/15 text-arc-extra border border-arc-extra/30'
                    }`}>
                      {bp.unlearned_count}/{characters.length}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ExtrasInventory() {
  const { data, isLoading } = useExtrasReport();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (isLoading) return <LoadingState />;
  if (!data || data.length === 0) return <EmptyState message="No extra blueprints found across any characters." />;

  const totalExtras = data.reduce((s, bp) => s + bp.total_extras, 0);
  const toggle = (id: number) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div>
      <p className="text-sm text-arc-muted mb-4">
        <span className="text-arc-text font-semibold">{totalExtras}</span> total extras across{' '}
        <span className="text-arc-text font-semibold">{data.length}</span> blueprint types.
      </p>

      <div className="card overflow-hidden divide-y divide-arc-border/50">
        {data.map((bp: ExtrasReport) => {
          const isOpen = expanded.has(bp.blueprint_id);
          return (
            <div key={bp.blueprint_id}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-arc-hover/40 transition-colors text-left"
                onClick={() => toggle(bp.blueprint_id)}
              >
                <BlueprintIcon slug={bp.slug} name={bp.blueprint_name} category={bp.category} size={28} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-arc-text">{bp.blueprint_name}</span>
                  <span className="ml-2 hidden sm:inline"><CategoryBadge category={bp.category} /></span>
                </div>
                <span className="badge bg-arc-extra/15 text-arc-extra border border-arc-extra/30 text-sm font-bold px-3 shrink-0">
                  {bp.total_extras} extra{bp.total_extras !== 1 ? 's' : ''}
                </span>
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-arc-muted shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-arc-muted shrink-0" />
                }
              </button>

              {isOpen && (
                <div className="bg-arc-bg/40 px-4 py-3 border-t border-arc-border/40">
                  <div className="flex flex-wrap gap-3">
                    {bp.character_breakdown.map(cb => (
                      <div
                        key={cb.character_id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                        style={{ backgroundColor: cb.character_color + '15', borderColor: cb.character_color + '40' }}
                      >
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cb.character_color }} />
                        <span className="text-sm text-arc-muted">{cb.character_name}</span>
                        {cb.character_label && (
                          <span className="text-xs text-arc-dim">·{' '}
                            {cb.character_label.split(',').map(l => l.trim()).filter(Boolean).join(', ')}
                          </span>
                        )}
                        <span className="text-sm font-bold font-mono ml-1" style={{ color: cb.character_color }}>
                          ×{cb.extras}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-center py-12">
      <div className="inline-block w-6 h-6 border-2 border-arc-accent/30 border-t-arc-accent rounded-full animate-spin mb-3" />
      <p className="text-arc-muted text-sm">Loading report…</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card p-10 text-center">
      <BarChart3 className="w-8 h-8 text-arc-dim mx-auto mb-3" />
      <p className="text-arc-muted text-sm">{message}</p>
    </div>
  );
}
