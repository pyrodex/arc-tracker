import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Circle, Search, X } from 'lucide-react';
import {
  useBlueprints,
  useStencils,
  useArcParts,
  useAmplificationComponents,
  useWorkshopStations,
  useTrackingMap,
  useStencilTrackingMap,
  useArcPartsTrackingMap,
  useAmplificationTrackingMap,
  useWorkshopMaterialsTrackingMap,
  useUpsertTracking,
  useUpsertStencilTracking,
  useUpsertArcPartTracking,
  useUpsertAmplificationTracking,
  useUpsertWorkshopMaterialTracking,
} from '../hooks/useApi';
import { useActiveCharacter } from '../hooks/useActiveCharacter';
import { toast } from '../hooks/toast';

const OPEN_EVENT = 'arc:quick-entry';

export function openQuickEntry() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Kind = 'blueprint' | 'stencil' | 'arc' | 'amp' | 'material';

const KIND_LABEL: Record<Kind, string> = {
  blueprint: 'Blueprint',
  stencil: 'Stencil',
  arc: 'ARC Part',
  amp: 'Amplification',
  material: 'Workshop',
};

const KIND_CLASS: Record<Kind, string> = {
  blueprint: 'text-arc-accent border-arc-accent/30 bg-arc-accent/10',
  stencil: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10',
  arc: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  amp: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  material: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
};

interface Item {
  key: string;
  kind: Kind;
  name: string;
  /** Count for parts/components/materials; extras for blueprints and stencils. */
  count: number;
  countLabel: string;
  learned?: boolean;
  setCount: (n: number) => void;
  setLearned?: (v: boolean) => void;
}

/** Matches every word of the query somewhere in the name, in any order. */
function matches(name: string, q: string) {
  const n = name.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => n.includes(w));
}

function QuickEntryPanel({ onClose }: { onClose: () => void }) {
  const { activeCharId, activeChar } = useActiveCharacter();
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: blueprints = [] } = useBlueprints();
  const { data: stencils = [] } = useStencils();
  const { data: arcParts = [] } = useArcParts();
  const { data: ampComponents = [] } = useAmplificationComponents();
  const { data: stations = [] } = useWorkshopStations();

  const { trackingMap: bpMap } = useTrackingMap(activeCharId);
  const { trackingMap: stMap } = useStencilTrackingMap(activeCharId);
  const { trackingMap: arcMap } = useArcPartsTrackingMap(activeCharId);
  const { trackingMap: ampMap } = useAmplificationTrackingMap(activeCharId);
  const { trackingMap: matMap } = useWorkshopMaterialsTrackingMap(activeCharId);

  const upBp = useUpsertTracking();
  const upSt = useUpsertStencilTracking();
  const upArc = useUpsertArcPartTracking();
  const upAmp = useUpsertAmplificationTracking();
  const upMat = useUpsertWorkshopMaterialTracking();

  const items = useMemo<Item[]>(() => {
    if (activeCharId === null) return [];
    const cid = activeCharId;
    const out: Item[] = [];
    for (const b of blueprints) {
      const t = bpMap[b.id];
      const learned = t?.learned === 1;
      const extras = t?.extras ?? 0;
      out.push({
        key: `bp-${b.id}`, kind: 'blueprint', name: b.name, count: extras, countLabel: 'extras', learned,
        setCount: n => upBp.mutate({ character_id: cid, blueprint_id: b.id, learned, extras: n }),
        setLearned: v => upBp.mutate({ character_id: cid, blueprint_id: b.id, learned: v, extras }),
      });
    }
    for (const s of stencils) {
      const t = stMap[s.id];
      const learned = t?.learned === 1;
      const extras = t?.extras ?? 0;
      out.push({
        key: `st-${s.id}`, kind: 'stencil', name: s.name, count: extras, countLabel: 'extras', learned,
        setCount: n => upSt.mutate({ character_id: cid, stencil_id: s.id, learned, extras: n }),
        setLearned: v => upSt.mutate({ character_id: cid, stencil_id: s.id, learned: v, extras }),
      });
    }
    for (const p of arcParts) {
      out.push({
        key: `arc-${p.id}`, kind: 'arc', name: p.name, count: arcMap[p.id]?.count ?? 0, countLabel: 'held',
        setCount: n => upArc.mutate({ character_id: cid, part_id: p.id, count: n }),
      });
    }
    for (const c of ampComponents) {
      out.push({
        key: `amp-${c.id}`, kind: 'amp', name: c.name, count: ampMap[c.id]?.count ?? 0, countLabel: 'held',
        setCount: n => upAmp.mutate({ character_id: cid, component_id: c.id, count: n }),
      });
    }
    // Workshop materials only exist as station requirements; ARC parts there
    // are already listed above.
    const seen = new Set<number>();
    for (const st of stations) for (const lvl of st.levels) for (const r of lvl.requirements) {
      if (r.item_type !== 'material' || seen.has(r.item_id)) continue;
      seen.add(r.item_id);
      out.push({
        key: `mat-${r.item_id}`, kind: 'material', name: r.name, count: matMap[r.item_id]?.count ?? 0, countLabel: 'held',
        setCount: n => upMat.mutate({ character_id: cid, material_id: r.item_id, count: n }),
      });
    }
    return out;
  }, [activeCharId, blueprints, stencils, arcParts, ampComponents, stations, bpMap, stMap, arcMap, ampMap, matMap,
      upBp, upSt, upArc, upAmp, upMat]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim();
    const hits = items.filter(i => matches(i.name, q));
    // Names that start with the query first, then alphabetical.
    const lq = q.toLowerCase();
    hits.sort((a, b) =>
      Number(b.name.toLowerCase().startsWith(lq)) - Number(a.name.toLowerCase().startsWith(lq))
      || a.name.localeCompare(b.name));
    return hits.slice(0, 40);
  }, [items, query]);

  useEffect(() => { setSel(0); }, [query]);
  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => {
    if (editing) draftRef.current?.select();
  }, [editing]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const startEdit = (item: Item) => {
    setEditing(item.key);
    setDraft(String(item.count));
  };

  const commit = (item: Item) => {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 9999 && n !== item.count) {
      item.setCount(n);
      toast(`${item.name}: ${item.countLabel} set to ${n}`, { tone: 'success', duration: 2500 });
    }
    setEditing(null);
    // Straight back to search for the next item.
    setQuery('');
    searchRef.current?.focus();
  };

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[sel]) { e.preventDefault(); startEdit(results[sel]); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Quick entry">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl card shadow-2xl flex flex-col max-h-[75vh] animate-fade-in">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-arc-border shrink-0">
          <Search className="w-4 h-4 text-arc-dim shrink-0" />
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Find an item, then press Enter to set its count…"
            className="flex-1 min-w-0 bg-transparent text-sm text-arc-text outline-hidden placeholder:text-arc-dim"
            aria-label="Search items"
          />
          {activeChar && (
            <span className="text-xs font-medium shrink-0 truncate max-w-[8rem]" style={{ color: activeChar.color }}>
              {activeChar.name}
            </span>
          )}
          <button onClick={onClose} className="btn-ghost p-1 shrink-0" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        <div ref={listRef} className="overflow-y-auto p-1.5">
          {!query.trim() ? (
            <div className="px-3 py-6 text-center text-sm text-arc-muted space-y-1">
              <p>Search blueprints, stencils, ARC parts, amplification and workshop materials.</p>
              <p className="text-xs text-arc-dim">
                <kbd className="font-mono">↑↓</kbd> choose · <kbd className="font-mono">Enter</kbd> edit count · type a number · <kbd className="font-mono">Enter</kbd> save
              </p>
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-arc-muted">No items match “{query}”.</p>
          ) : (
            results.map((item, idx) => (
              <div
                key={item.key}
                data-idx={idx}
                onMouseMove={() => setSel(idx)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md ${idx === sel ? 'bg-arc-hover' : ''}`}
              >
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border shrink-0 ${KIND_CLASS[item.kind]}`}>
                  {KIND_LABEL[item.kind]}
                </span>
                <span className="flex-1 min-w-0 truncate text-sm text-arc-text">{item.name}</span>

                {item.setLearned && (
                  <button
                    onClick={() => item.setLearned!(!item.learned)}
                    className={`shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-md border
                      ${item.learned ? 'text-arc-learned border-arc-learned/30 bg-arc-learned/10' : 'text-arc-muted border-arc-border hover:text-arc-text'}`}
                    title={item.learned ? 'Mark as not learned' : 'Mark as learned'}
                  >
                    {item.learned ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                    {item.learned ? 'Learned' : 'Learn'}
                  </button>
                )}

                {editing === item.key ? (
                  <input
                    ref={draftRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); commit(item); }
                      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEditing(null); searchRef.current?.focus(); }
                    }}
                    onBlur={() => setEditing(null)}
                    inputMode="numeric"
                    aria-label={`${item.name} ${item.countLabel}`}
                    className="w-16 shrink-0 input py-1 px-2 text-center text-sm tabular-nums"
                  />
                ) : (
                  <button
                    onClick={() => startEdit(item)}
                    className="w-16 shrink-0 text-right text-sm tabular-nums text-arc-muted hover:text-arc-text"
                    title={`Set ${item.countLabel}`}
                  >
                    <span className={item.count > 0 ? 'text-arc-text font-semibold' : ''}>{item.count}</span>
                    <span className="text-xs text-arc-dim"> {item.countLabel}</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Ctrl/Cmd+K (or "/") from anywhere: find an item and set its count without
 * leaving the page you're on. Edits the shared active character.
 */
export default function QuickEntry() {
  const [open, setOpen] = useState(false);
  const { activeCharId } = useActiveCharacter();

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!open || activeCharId === null) return null;
  return <QuickEntryPanel onClose={() => setOpen(false)} />;
}
