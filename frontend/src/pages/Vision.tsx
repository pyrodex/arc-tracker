import { useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw, ScanEye } from 'lucide-react';
import type { VisionItemType, VisionSync } from '../types';
import { useRevertVisionSync, useVisionSyncs } from '../hooks/useApi';
import { useActiveCharacter } from '../hooks/useActiveCharacter';
import { toast } from '../hooks/toast';

const TYPE_LABEL: Record<VisionItemType, string> = {
  blueprint: 'Blueprint',
  stencil: 'Stencil',
  arc_part: 'ARC part',
  amplification: 'Amplification',
  workshop_material: 'Workshop',
};

// SQLite datetime('now') is UTC without a zone marker.
function when(ts: string) {
  return new Date(ts.replace(' ', 'T') + 'Z').toLocaleString();
}

function SyncCard({ sync }: { sync: VisionSync }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const revert = useRevertVisionSync();
  const learnedCount = sync.changes.filter(c => c.field === 'learned').length;
  const counts = sync.changes.filter(c => c.field !== 'learned');
  const up = counts.filter(c => c.after > c.before).length;
  const down = counts.length - up;

  const doRevert = () => {
    if (!confirming) { setConfirming(true); return; }
    setConfirming(false);
    revert.mutate(sync.id, {
      onSuccess: r => {
        toast(
          r.skipped.length
            ? `Reverted ${r.reverted.length}; kept ${r.skipped.length} edited since the sync.`
            : `Reverted ${r.reverted.length} change${r.reverted.length === 1 ? '' : 's'}.`,
          { tone: 'success' },
        );
      },
    });
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
          aria-expanded={open}
        >
          {open ? <ChevronDown className="w-4 h-4 text-arc-dim shrink-0" /> : <ChevronRight className="w-4 h-4 text-arc-dim shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm text-arc-text font-medium truncate">
              {sync.character_name} · {sync.changes.length} change{sync.changes.length === 1 ? '' : 's'}
              <span className="text-arc-dim font-normal">
                {' '}({up} up, {down} down{learnedCount ? `, ${learnedCount} learned` : ''})
              </span>
            </p>
            <p className="text-xs text-arc-dim">#{sync.id} · {when(sync.created_at)} · {sync.source ?? 'arc-vision'}</p>
          </div>
        </button>
        {sync.reverted_at ? (
          <span className="text-xs px-2 py-1 rounded-md border border-arc-border text-arc-dim">Reverted</span>
        ) : (
          <button
            onClick={doRevert}
            onBlur={() => setConfirming(false)}
            disabled={revert.isPending}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors
              ${confirming
                ? 'bg-arc-danger/15 text-arc-danger border-arc-danger/40'
                : 'border-arc-border text-arc-muted hover:text-arc-text hover:border-arc-muted/60'}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {confirming ? 'Click again to revert' : 'Revert'}
          </button>
        )}
      </div>
      {open && (
        <table className="w-full text-sm border-t border-arc-border">
          <thead>
            <tr className="text-xs text-arc-dim text-left">
              <th className="px-4 py-2 font-medium">Item</th>
              <th className="px-4 py-2 font-medium hidden sm:table-cell">Area</th>
              <th className="px-4 py-2 font-medium text-right">Before</th>
              <th className="px-4 py-2 font-medium text-right">After</th>
            </tr>
          </thead>
          <tbody>
            {sync.changes.map(c => (
              <tr key={`${c.type}:${c.id}`} className="border-t border-arc-border/60">
                <td className="px-4 py-1.5 text-arc-text">{c.name}</td>
                <td className="px-4 py-1.5 text-arc-muted hidden sm:table-cell">
                  {TYPE_LABEL[c.type]}{c.field === 'extras' ? ' extras' : c.field === 'learned' ? ' learned' : ''}
                </td>
                <td className="px-4 py-1.5 text-right tabular-nums text-arc-muted">
                  {c.field === 'learned' ? (c.before ? 'Learned' : 'Not learned') : c.before}
                </td>
                <td className={`px-4 py-1.5 text-right tabular-nums font-medium ${c.after > c.before ? 'text-arc-learned' : 'text-arc-extra'}`}>
                  {c.field === 'learned' ? (c.after ? 'Learned' : 'Not learned') : c.after}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Vision() {
  const { activeChar } = useActiveCharacter();
  const [onlyActive, setOnlyActive] = useState(false);
  const { data: syncs = [], isLoading } = useVisionSyncs(onlyActive && activeChar ? activeChar.id : null);

  return (
    <div className="flex flex-col md:h-full">
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-arc-border bg-arc-panel/50 shrink-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-arc-text">Vision Sync</h1>
            <p className="text-xs text-arc-dim mt-0.5 max-w-xl">
              Counts the arc-vision desktop agent read from your stash. Each sync only changes items it saw;
              reverting restores the old values except where you've edited an item since.
            </p>
          </div>
          {activeChar && (
            <label className="flex items-center gap-2 text-xs text-arc-muted cursor-pointer">
              <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} />
              Only {activeChar.name}
            </label>
          )}
        </div>
      </div>

      <div className="flex-1 md:overflow-y-auto p-4 sm:p-6 space-y-3">
        {isLoading ? (
          <p className="text-arc-muted text-sm">Loading…</p>
        ) : syncs.length === 0 ? (
          <div className="card p-6 text-center max-w-lg mx-auto">
            <ScanEye className="w-8 h-8 text-arc-accent mx-auto mb-3" />
            <p className="text-arc-text font-medium mb-1">No syncs yet</p>
            <p className="text-sm text-arc-muted">
              Run the arc-vision agent on your gaming PC (see <code>agent/README.md</code> in the repo),
              scan your stash, then preview and apply. Applied syncs show up here.
            </p>
          </div>
        ) : (
          syncs.map(s => <SyncCard key={s.id} sync={s} />)
        )}
      </div>
    </div>
  );
}
