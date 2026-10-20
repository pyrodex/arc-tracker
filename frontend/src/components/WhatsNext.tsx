import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, Gift, Wrench, Zap } from 'lucide-react';
import {
  useWorkshopStations,
  useWorkshopProgressMap,
  useGunConfigs,
  useAmplificationComponents,
  useAmplificationTrackingMap,
  useUnlearnedReport,
  useExtrasReport,
  useStencilUnlearnedReport,
  useStencilExtrasReport,
} from '../hooks/useApi';
import { useActiveCharacter } from '../hooks/useActiveCharacter';
import { useWorkshopRequirements } from '../hooks/useWorkshopRequirements';
import { levelStatus } from './WorkshopStationCard';
import type { CharacterExtras, CharacterLearnStatus } from '../types';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const SHOWN = 5;

function Panel({ icon, title, to, linkLabel, children, empty }: {
  icon: ReactNode; title: string; to: string; linkLabel: string; children: ReactNode; empty?: string | false;
}) {
  return (
    <section className="card p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-arc-text flex-1">{title}</h3>
        <Link to={to} className="text-xs text-arc-muted hover:text-arc-accent inline-flex items-center gap-1">
          {linkLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {empty ? <p className="text-sm text-arc-dim">{empty}</p> : children}
    </section>
  );
}

interface Handover {
  key: string;
  name: string;
  kind: 'Blueprint' | 'Stencil';
  from: CharacterExtras[];
  to: CharacterLearnStatus[];
}

/** Spares one character holds that another character still needs to learn. */
function handovers<T extends { characters: CharacterLearnStatus[] }>(
  kind: Handover['kind'],
  unlearned: (T & { id: number; name: string })[],
  extras: { id: number; breakdown: CharacterExtras[] }[],
): Handover[] {
  const extrasById = new Map(extras.map(e => [e.id, e.breakdown.filter(b => b.extras > 0)]));
  const out: Handover[] = [];
  for (const row of unlearned) {
    const holders = extrasById.get(row.id) ?? [];
    if (!holders.length) continue;
    const needers = row.characters.filter(c => !c.learned && !holders.every(h => h.character_id === c.character_id));
    if (!needers.length) continue;
    out.push({ key: `${kind}-${row.id}`, name: row.name, kind, from: holders, to: needers });
  }
  return out;
}

/**
 * The Dashboard's "what can I do now" panel: the nearest workshop upgrades for
 * the current character, builds it could amplify, blueprints nobody has, and
 * spares worth handing to another character.
 */
export default function WhatsNext() {
  const { characters, activeCharId, activeChar } = useActiveCharacter();

  // ── Workshop ────────────────────────────────────────────────────────────────
  const { data: stations = [] } = useWorkshopStations();
  const { progressMap } = useWorkshopProgressMap(activeCharId);
  const getRequirementData = useWorkshopRequirements(activeCharId);

  const upgrades = useMemo(() => stations.flatMap(st => {
    const current = progressMap[st.id] ?? 0;
    const next = st.levels.find(l => l.level === current + 1);
    if (!next) return [];
    const status = levelStatus(next.requirements, getRequirementData);
    return [{ station: st.name, level: next.level, note: next.note, status }];
  }).sort((a, b) =>
    Number(b.status.missing.length === 0) - Number(a.status.missing.length === 0)
    || Number(b.status.pooled) - Number(a.status.pooled)
    || a.status.missing.length - b.status.missing.length), [stations, progressMap, getRequirementData]);

  // ── Amplification ───────────────────────────────────────────────────────────
  const { data: configs = [] } = useGunConfigs(activeCharId);
  const { data: ampComponents = [] } = useAmplificationComponents();
  const { trackingMap: ampHeld } = useAmplificationTrackingMap(activeCharId);
  const gunsmith = stations.find(s => s.slug === 'gunsmith');
  const research = stations.find(s => s.slug === 'research-station');
  const benchesReady = (!gunsmith || (progressMap[gunsmith.id] ?? 0) >= 4)
    && (!research || (progressMap[research.id] ?? 0) >= 4);

  const amplifiable = useMemo(() => configs
    .filter(c => c.amp_module && !c.amplified)
    .map(c => {
      const mod = ampComponents.find(a => a.kind === 'module' && a.tier === c.amp_module);
      return { config: c, moduleName: mod?.name ?? `Module Mk. ${ROMAN[c.amp_module!]}`, held: mod ? ampHeld[mod.id]?.count ?? 0 : 0 };
    })
    .sort((a, b) => Number(b.held > 0) - Number(a.held > 0)), [configs, ampComponents, ampHeld]);

  // ── Collection ──────────────────────────────────────────────────────────────
  const { data: unlearned = [] } = useUnlearnedReport();
  const { data: extras = [] } = useExtrasReport();
  const { data: stUnlearned = [] } = useStencilUnlearnedReport();
  const { data: stExtras = [] } = useStencilExtrasReport();

  const nobodyHas = useMemo(
    () => characters.length ? unlearned.filter(b => b.characters.every(c => !c.learned)) : [],
    [unlearned, characters.length],
  );

  const gifts = useMemo(() => characters.length < 2 ? [] : [
    ...handovers('Blueprint', unlearned, extras.map(e => ({ id: e.blueprint_id, breakdown: e.character_breakdown }))),
    ...handovers('Stencil', stUnlearned, stExtras.map(e => ({ id: e.stencil_id, breakdown: e.character_breakdown }))),
  ], [characters.length, unlearned, extras, stUnlearned, stExtras]);

  if (!activeChar) return null;

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between gap-2 mb-4 flex-wrap">
        <h2 className="text-base font-semibold text-arc-text">What’s next</h2>
        <p className="text-xs text-arc-dim">
          Workshop and amplification are for <span className="font-semibold" style={{ color: activeChar.color }}>{activeChar.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Panel
          icon={<Wrench className="w-4 h-4 text-sky-400" />}
          title="Closest workshop upgrades"
          to="/workshop" linkLabel="Workshop"
          empty={upgrades.length === 0 && 'Every station is at its max level.'}
        >
          <ul className="space-y-2">
            {upgrades.slice(0, SHOWN).map(u => {
              const ready = u.status.missing.length === 0;
              return (
                <li key={u.station} className="flex items-start gap-3 text-sm">
                  <span className="flex-1 min-w-0">
                    <span className="text-arc-text">{u.station}</span>
                    <span className="text-arc-dim"> → level {u.level}</span>
                    {!ready && (
                      <span className="block text-xs text-arc-dim truncate" title={u.status.missing.map(m => `${m.short}× ${m.name}`).join(', ')}>
                        Short {u.status.missing.map(m => `${m.short}× ${m.name}`).join(', ')}
                      </span>
                    )}
                    {u.note && <span className="block text-xs text-arc-dim">{u.note}</span>}
                  </span>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border
                    ${ready ? 'text-arc-learned border-arc-learned/30 bg-arc-learned/10'
                      : u.status.pooled ? 'text-arc-extra border-arc-extra/30 bg-arc-extra/10'
                        : 'text-arc-muted border-arc-border'}`}>
                    {ready ? 'Ready' : u.status.pooled ? 'If pooled' : `Short ${u.status.missing.length}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel
          icon={<Zap className="w-4 h-4 text-amber-400" />}
          title="Builds you could amplify"
          to="/loadouts" linkLabel="Loadouts"
          empty={amplifiable.length === 0 && 'No un-amplified builds of weapons that can be amplified.'}
        >
          {!benchesReady && (
            <p className="text-xs text-arc-extra mb-2">Amplifying needs Gunsmith 4 and Research Station 4.</p>
          )}
          <ul className="space-y-2">
            {amplifiable.slice(0, SHOWN).map(({ config, moduleName, held }) => (
              <li key={config.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1 min-w-0 truncate">
                  <span className="text-arc-text">{config.weapon_name}</span>
                  {config.name && <span className="text-arc-dim"> · {config.name}</span>}
                  <span className="text-arc-dim"> ×{config.quantity}</span>
                </span>
                <span className={`shrink-0 text-xs tabular-nums ${held > 0 ? 'text-arc-learned' : 'text-arc-dim'}`}>
                  {held > 0 && <Check className="w-3 h-3 inline -mt-0.5 mr-0.5" />}
                  {moduleName.replace('Amplification ', '')}: {held}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          icon={<BookOpen className="w-4 h-4 text-arc-accent" />}
          title="Blueprints no character has learned"
          to="/reports?report=blueprints" linkLabel="Report"
          empty={nobodyHas.length === 0 && 'Every blueprint is learned by at least one character.'}
        >
          <p className="text-sm text-arc-muted mb-2">
            <span className="text-arc-text font-semibold">{nobodyHas.length}</span> blueprint{nobodyHas.length === 1 ? '' : 's'} still to find
          </p>
          <div className="flex flex-wrap gap-1.5">
            {nobodyHas.slice(0, 12).map(b => (
              <span key={b.id} className="text-xs px-2 py-0.5 rounded-md bg-arc-border/40 text-arc-muted">{b.name}</span>
            ))}
            {nobodyHas.length > 12 && <span className="text-xs text-arc-dim px-1 py-0.5">+{nobodyHas.length - 12} more</span>}
          </div>
        </Panel>

        <Panel
          icon={<Gift className="w-4 h-4 text-arc-extra" />}
          title="Spares another character can learn"
          to="/reports?report=blueprints&view=extras" linkLabel="Extras"
          empty={characters.length < 2
            ? 'Add a second character to see spares you could hand over.'
            : gifts.length === 0 && 'No spares that another character still needs.'}
        >
          <ul className="space-y-2">
            {gifts.slice(0, SHOWN).map(g => (
              <li key={g.key} className="text-sm">
                <span className="text-arc-text">{g.name}</span>
                <span className="text-xs text-arc-dim"> · {g.kind}</span>
                <span className="block text-xs text-arc-muted">
                  {g.from.map((f, i) => (
                    <span key={f.character_id}>
                      {i > 0 && ', '}
                      <span style={{ color: f.character_color }}>{f.character_name}</span> has {f.extras}
                    </span>
                  ))}
                  {' → '}
                  {g.to.map((t, i) => (
                    <span key={t.character_id}>
                      {i > 0 && ', '}
                      <span style={{ color: t.character_color }}>{t.character_name}</span>
                    </span>
                  ))}
                  {' still needs it'}
                </span>
              </li>
            ))}
            {gifts.length > SHOWN && <li className="text-xs text-arc-dim">+{gifts.length - SHOWN} more</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
