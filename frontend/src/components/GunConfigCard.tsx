import { useState } from 'react';
import { Minus, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import type { GunConfig, ModSlotMeta } from '../types';

const ROMAN = ['', 'I', 'II', 'III', 'IV'];

interface Props {
  config: GunConfig;
  slots: ModSlotMeta[];
  onQuantity: (id: number, delta: number) => void;
  onSetQuantity: (id: number, quantity: number) => void;
  onEdit: (config: GunConfig) => void;
  onDelete: (config: GunConfig) => void;
}

export default function GunConfigCard({
  config, slots, onQuantity, onSetQuantity, onEdit, onDelete,
}: Props) {
  const [draftQty, setDraftQty] = useState<string | null>(null);

  const bySlot = new Map(config.mods.map(m => [m.slot, m]));
  const filledSlots = slots.filter(s => bySlot.has(s.slot));

  // A build is only fully priced once the weapon and every attached mod has a
  // value — otherwise the total silently understates what the build is worth.
  const unpricedMods = config.mods.filter(m => m.sell_value === 0);
  const incomplete = config.weapon_value === 0 || unpricedMods.length > 0;

  const commitQty = () => {
    if (draftQty === null) return;
    const parsed = parseInt(draftQty, 10);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed !== config.quantity) {
      onSetQuantity(config.id, Math.min(parsed, 9999));
    }
    setDraftQty(null);
  };

  return (
    <div className="card p-4 flex flex-col gap-3">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-arc-text truncate">{config.weapon_name}</h3>
            {config.tier != null && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-arc-accent/15 text-arc-accent border border-arc-accent/25 tabular-nums">
                {ROMAN[config.tier] ?? config.tier}
              </span>
            )}
          </div>
          {config.name && <p className="text-xs text-arc-muted truncate mt-0.5">{config.name}</p>}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(config)} className="btn-ghost p-1.5" aria-label="Edit build">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(config)} className="btn-ghost p-1.5 hover:text-red-400" aria-label="Delete build">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mods by slot */}
      {filledSlots.length === 0 ? (
        <p className="text-xs text-arc-dim italic">No mods attached — base weapon.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {filledSlots.map(slot => {
            const mod = bySlot.get(slot.slot)!;
            return (
              <span
                key={slot.slot}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-arc-border/40 border border-arc-border text-arc-muted"
                title={`${slot.label}${mod.craftable ? '' : ' · loot-only'}`}
              >
                <span className="text-arc-dim uppercase tracking-wide text-[9px]">{slot.label}</span>
                <span className="text-arc-text">{mod.name}</span>
                {!mod.craftable && <span className="text-amber-400" title="Loot-only">◆</span>}
              </span>
            );
          })}
        </div>
      )}

      {/* Values */}
      <div className="flex items-end justify-between gap-3 pt-1 border-t border-arc-border">
        <div className="text-xs space-y-0.5">
          <p className="text-arc-dim">
            Weapon <span className="text-arc-muted tabular-nums">{config.weapon_value.toLocaleString()}</span>
            {config.mods.length > 0 && (
              <> + mods <span className="text-arc-muted tabular-nums">{config.mods_value.toLocaleString()}</span></>
            )}
          </p>
          <p className="text-arc-muted">
            <span className="tabular-nums font-medium text-arc-text">{config.unit_value.toLocaleString()}</span> each
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-arc-dim uppercase tracking-wide">Total value</p>
          <p className="text-base font-semibold text-arc-extra tabular-nums leading-tight">
            {config.total_value.toLocaleString()}
          </p>
        </div>
      </div>

      {incomplete && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-400/90">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            {config.weapon_value === 0 && 'Weapon value not set'}
            {config.weapon_value === 0 && unpricedMods.length > 0 && '; '}
            {unpricedMods.length > 0 && `${unpricedMods.length} mod${unpricedMods.length > 1 ? 's' : ''} unpriced`}
            {' '}— total is understated.
          </span>
        </p>
      )}

      {/* Quantity stepper */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-arc-dim uppercase tracking-wide">Owned</span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onQuantity(config.id, -1)}
            disabled={config.quantity === 0}
            className="btn-ghost p-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <input
            className="input w-16 py-1 text-center text-sm tabular-nums"
            value={draftQty ?? config.quantity}
            onChange={e => setDraftQty(e.target.value.replace(/[^0-9]/g, ''))}
            onFocus={() => setDraftQty(String(config.quantity))}
            onBlur={commitQty}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') { setDraftQty(null); e.currentTarget.blur(); }
            }}
            inputMode="numeric"
            aria-label="Quantity owned"
          />

          <button
            onClick={() => onQuantity(config.id, 1)}
            className="btn-ghost p-1.5"
            aria-label="Increase quantity"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
