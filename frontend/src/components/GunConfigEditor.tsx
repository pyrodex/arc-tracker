import { useEffect, useMemo, useState } from 'react';
import { Zap } from 'lucide-react';
import type { GunConfig, WeaponAmplification, WeaponCatalog, WeaponModCatalog, WeaponPriceCatalog } from '../types';
import Modal from './Modal';

const TIERS = [1, 2, 3, 4];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

/** Amplification conflicts that name a mod slot rather than another option. */
const SLOT_CONFLICTS: Record<string, string> = { 'Magazine Mod': 'magazine', 'Stock Mod': 'stock' };

export interface GunConfigSavePayload {
  weapon_id: number;
  name: string | null;
  tier: number | null;
  weapon_value: number;
  quantity: number;
  notes: string | null;
  mod_ids: number[];
  amplified: boolean;
  amplification_ids: number[];
}

/**
 * Why an option can't be picked right now, or null if it can. Mirrors the
 * server's rules so the editor never offers a combination the API rejects.
 */
function blockedReason(
  opt: WeaponAmplification,
  picked: WeaponAmplification[],
  usedSlots: Set<string>,
): string | null {
  const pickedNames = new Set(picked.map(p => p.name));
  const missing = opt.requires.filter(r => !pickedNames.has(r));
  if (missing.length) return `Requires ${missing.join(', ')}`;
  const clash = picked.find(p => p.id !== opt.id && (p.conflicts.includes(opt.name) || opt.conflicts.includes(p.name)));
  if (clash) return `Conflicts with ${clash.name}`;
  for (const c of opt.conflicts) {
    const slot = SLOT_CONFLICTS[c];
    if (slot && usedSlots.has(slot)) return `Can't be used with a ${slot} mod`;
  }
  return null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  catalog: WeaponModCatalog;
  /** Seeded wiki prices, used to auto-fill the weapon value field. */
  priceCatalog: WeaponPriceCatalog | undefined;
  weaponCatalog: WeaponCatalog | undefined;
  /** null puts the editor in create mode. */
  config: GunConfig | null;
  /**
   * Copy mode: prefill from this build but save as a new one. Distinct from
   * `config`, which edits in place.
   */
  copyFrom: GunConfig | null;
  saving: boolean;
  error: string | null;
  onSave: (payload: GunConfigSavePayload) => void;
}

export default function GunConfigEditor({
  open, onClose, catalog, priceCatalog, weaponCatalog, config, copyFrom, saving, error, onSave,
}: Props) {
  const [weaponId, setWeaponId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState<number | ''>('');
  const [weaponValue, setWeaponValue] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  // One mod id per slot — the shape the one-per-slot rule implies.
  const [slotPicks, setSlotPicks] = useState<Record<string, number | ''>>({});
  // Once the value field is edited by hand, stop auto-filling it from the wiki.
  const [valueTouched, setValueTouched] = useState(false);
  // Level 5: amplified flag and the active amplification options.
  const [amplified, setAmplified] = useState(false);
  const [ampPicks, setAmpPicks] = useState<number[]>([]);

  // Reload the form whenever the editor opens, or switches config/source.
  // `source` is whichever build we're reading from: the one being edited, or
  // the one being copied.
  const source = config ?? copyFrom;
  useEffect(() => {
    if (!open) return;
    setWeaponId(source?.weapon_id ?? '');
    // A copy starts from the original's name with a suffix, so two builds are
    // never indistinguishable in the list.
    setName(copyFrom ? `${copyFrom.name || copyFrom.weapon_name} (copy)`.slice(0, 64) : (config?.name ?? ''));
    setTier(source?.tier ?? '');
    setWeaponValue(source ? String(source.weapon_value) : '');
    // A copy deliberately starts at zero held — copying a build you own 14 of
    // shouldn't silently claim you own 14 more.
    setQuantity(copyFrom ? '0' : (config ? String(config.quantity) : '0'));
    setNotes(source?.notes ?? '');
    setSlotPicks(Object.fromEntries((source?.mods ?? []).map(m => [m.slot, m.id])));
    setAmplified(!!source?.amplified);
    setAmpPicks((source?.amplifications ?? []).map(a => a.id));
    // A stored value is authoritative, whether editing or copying; only a
    // blank new build auto-fills from the wiki.
    setValueTouched(!!source);
  }, [open, config, copyFrom, source]);

  const weapons = weaponCatalog?.weapons ?? [];
  const selectedWeapon = weapons.find(w => w.id === weaponId);

  // Weapons that can't be upgraded have no tier; the field is disabled rather
  // than hidden so the reason stays visible.
  const canTier = selectedWeapon ? selectedWeapon.tiered === 1 : true;

  const canAmplify = !!selectedWeapon?.amp_module;
  const isAmplified = canAmplify && amplified;
  const ampOptions = useMemo(
    () => (weaponCatalog?.amplifications ?? []).filter(a => a.weapon_id === weaponId),
    [weaponCatalog, weaponId],
  );
  const pickedAmps = ampOptions.filter(a => ampPicks.includes(a.id));

  // Switching weapon drops options that belonged to the old one.
  useEffect(() => {
    setAmpPicks(prev => prev.filter(id => ampOptions.some(a => a.id === id)));
  }, [ampOptions]);

  // The wiki price for the current weapon/tier. Tier 0 covers weapons that
  // cannot be upgraded; null means the wiki has no figure (e.g. Canto).
  const catalogValue = useMemo(() => {
    // The wiki doesn't price Level 5 weapons.
    if (isAmplified) return null;
    if (weaponId === '' || !priceCatalog) return null;
    const forWeapon = priceCatalog.prices[weaponId];
    if (!forWeapon) return null;
    return forWeapon[tier === '' ? 0 : tier] ?? null;
  }, [weaponId, tier, priceCatalog, isAmplified]);

  // Auto-fill until the field is touched, so picking Bobcat + IV just works.
  useEffect(() => {
    if (!open || valueTouched) return;
    setWeaponValue(catalogValue === null ? '' : String(catalogValue));
  }, [open, valueTouched, catalogValue]);

  const modsBySlot = useMemo(() => {
    const grouped: Record<string, typeof catalog.mods> = {};
    for (const mod of catalog.mods) (grouped[mod.slot] ??= []).push(mod);
    return grouped;
  }, [catalog.mods]);

  const selectedMods = useMemo(
    () => Object.values(slotPicks)
      .filter((id): id is number => typeof id === 'number')
      .map(id => catalog.mods.find(m => m.id === id))
      .filter((m): m is NonNullable<typeof m> => !!m),
    [slotPicks, catalog.mods],
  );

  const usedSlots = new Set(selectedMods.map(m => m.slot));
  // Slots an active amplification rules out, e.g. Ergonomic Bolt → stock.
  const blockedSlots = new Map<string, string>();
  if (isAmplified) {
    for (const a of pickedAmps) {
      for (const c of a.conflicts) if (SLOT_CONFLICTS[c]) blockedSlots.set(SLOT_CONFLICTS[c], a.name);
    }
  }

  const toggleAmp = (opt: WeaponAmplification) => {
    setAmpPicks(prev => {
      if (!prev.includes(opt.id)) return [...prev, opt.id];
      // Removing an option also removes anything that requires it.
      const removed = new Set([opt.name]);
      let next = prev.filter(id => id !== opt.id);
      let changed = true;
      while (changed) {
        changed = false;
        for (const id of next) {
          const a = ampOptions.find(o => o.id === id);
          if (a && a.requires.some(r => removed.has(r))) {
            removed.add(a.name);
            next = next.filter(x => x !== id);
            changed = true;
          }
        }
      }
      return next;
    });
  };

  const ampCost = useMemo(() => {
    const totals = new Map<string, number>();
    for (const a of pickedAmps) for (const m of a.materials) totals.set(m.name, (totals.get(m.name) ?? 0) + m.qty);
    return [...totals];
  }, [pickedAmps]);

  const modsValue = selectedMods.reduce((sum, m) => sum + m.sell_value, 0);
  const unitValue = (parseInt(weaponValue, 10) || 0) + modsValue;
  const totalValue = unitValue * (parseInt(quantity, 10) || 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (weaponId === '') return;
    onSave({
      weapon_id: weaponId,
      name: name.trim() || null,
      // Level 5 comes after tier IV, so an amplified tiered weapon is IV.
      tier: canTier ? (isAmplified ? 4 : tier !== '' ? tier : null) : null,
      weapon_value: parseInt(weaponValue, 10) || 0,
      quantity: parseInt(quantity, 10) || 0,
      notes: notes.trim() || null,
      mod_ids: selectedMods.map(m => m.id),
      amplified: isAmplified,
      amplification_ids: isAmplified ? pickedAmps.map(a => a.id) : [],
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={config ? 'Edit build' : copyFrom ? 'Copy build' : 'New build'}
      width="max-w-2xl"
    >
      {copyFrom && (
        <p className="text-xs text-arc-muted mb-4 -mt-1">
          Copied from <span className="text-arc-text">{copyFrom.name || copyFrom.weapon_name}</span>.
          Change what differs and save — the original is untouched.
        </p>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-arc-dim uppercase tracking-wide">Weapon</span>
            <select
              className="input mt-1 w-full"
              value={weaponId}
              onChange={e => setWeaponId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">Select a weapon…</option>
              {(weaponCatalog?.classes ?? []).map(cls => {
                const inClass = weapons.filter(w => w.class === cls);
                if (!inClass.length) return null;
                return (
                  <optgroup key={cls} label={cls}>
                    {inClass.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                        {w.blueprint_id === null && w.gunsmith_level
                          ? ` · Gunsmith ${w.gunsmith_level}`
                          : ''}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            {selectedWeapon && selectedWeapon.blueprint_id === null && (
              <span className="text-[10px] text-arc-dim">
                Unlocked at Gunsmith {selectedWeapon.gunsmith_level} — no blueprint to find.
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-xs text-arc-dim uppercase tracking-wide">Tier</span>
            <select
              className="input mt-1 w-full disabled:opacity-50"
              value={isAmplified ? (canTier ? 5 : '') : canTier ? tier : ''}
              disabled={!canTier || isAmplified}
              onChange={e => setTier(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">{isAmplified ? 'Level 5 · Amplified' : 'None'}</option>
              {TIERS.map(t => <option key={t} value={t}>{ROMAN[t]} ({t})</option>)}
              {isAmplified && canTier && <option value={5}>V · Amplified</option>}
            </select>
            {isAmplified ? (
              <span className="text-[10px] text-arc-dim">Level 5 — upgraded past IV by amplifying.</span>
            ) : !canTier && selectedWeapon && (
              <span className="text-[10px] text-arc-dim">
                {selectedWeapon.rarity ?? 'This weapon'} — cannot be upgraded.
              </span>
            )}
          </label>
        </div>

        <label className="block">
          <span className="text-xs text-arc-dim uppercase tracking-wide">
            Build name <span className="text-arc-dim/60 normal-case">(optional)</span>
          </span>
          <input
            className="input mt-1 w-full"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Bobcat 4 CQB"
            maxLength={64}
          />
        </label>

        {/* Mod slots — one pick each, which is the rule the schema enforces. */}
        <div>
          <span className="text-xs text-arc-dim uppercase tracking-wide">Mods</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            {catalog.slots.map(slot => (
              <label key={slot.slot} className="block">
                <span className="text-[11px] text-arc-muted">
                  {slot.label}
                  {blockedSlots.has(slot.slot) && (
                    <span className="text-amber-400/90"> · blocked by {blockedSlots.get(slot.slot)}</span>
                  )}
                </span>
                <select
                  className="input mt-1 w-full text-sm disabled:opacity-50"
                  disabled={blockedSlots.has(slot.slot)}
                  value={slotPicks[slot.slot] ?? ''}
                  onChange={e => setSlotPicks(prev => ({
                    ...prev,
                    [slot.slot]: e.target.value ? Number(e.target.value) : '',
                  }))}
                >
                  <option value="">— none —</option>
                  {(modsBySlot[slot.slot] ?? []).map(mod => (
                    <option key={mod.id} value={mod.id}>
                      {mod.name}
                      {mod.variant ? ` · ${mod.variant}` : ''}
                      {mod.craftable ? '' : ' · loot-only'}
                      {mod.sell_value > 0 ? ` · ${mod.sell_value.toLocaleString()}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>

        {/* Amplification (Level 5) — only for the weapons that support it. */}
        {canAmplify && selectedWeapon && (
          <div className={`rounded-lg border ${isAmplified ? 'border-amber-500/40 bg-amber-500/5' : 'border-arc-border'} p-3`}>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={isAmplified}
                onChange={e => setAmplified(e.target.checked)}
              />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-arc-text">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Amplified (Level 5)
                </span>
                <span className="block text-[11px] text-arc-dim">
                  Needs Amplification Module Mk. {ROMAN[selectedWeapon.amp_module!]}, Gunsmith 4 and Research Station 4.
                </span>
              </span>
            </label>

            {isAmplified && (
              <div className="mt-3 space-y-2">
                {ampOptions.map(opt => {
                  const picked = ampPicks.includes(opt.id);
                  const reason = picked ? null : blockedReason(opt, pickedAmps, usedSlots);
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-2 rounded-md border px-2.5 py-2 transition-colors
                        ${picked ? 'border-amber-500/50 bg-amber-500/10' : 'border-arc-border'}
                        ${reason ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-arc-muted/60'}`}
                      title={opt.description ?? undefined}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={picked}
                        disabled={!!reason}
                        onChange={() => toggleAmp(opt)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2 flex-wrap">
                          <span className="text-sm text-arc-text">{opt.name}</span>
                          <span className="text-[11px] text-arc-muted tabular-nums">
                            {opt.materials.map(m => `${m.qty}× ${m.name}`).join(', ')}
                          </span>
                        </span>
                        {opt.effects.length > 0 && (
                          <span className="block text-[11px] text-arc-dim mt-0.5">{opt.effects.join(' · ')}</span>
                        )}
                        <span className="block text-[10px] text-arc-dim mt-0.5">
                          {opt.research ? `Research: ${opt.research}` : 'No research needed'}
                          {reason && <span className="text-amber-400/90"> · {reason}</span>}
                        </span>
                      </span>
                    </label>
                  );
                })}

                {pickedAmps.length > 0 && (
                  <p className="text-[11px] text-arc-muted">
                    Per gun: Module Mk. {ROMAN[selectedWeapon.amp_module!]}
                    {ampCost.map(([name, qty]) => ` + ${qty}× ${name}`).join('')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-arc-dim uppercase tracking-wide">Weapon value</span>
            <input
              className="input mt-1 w-full tabular-nums"
              value={weaponValue}
              onChange={e => {
                setValueTouched(true);
                setWeaponValue(e.target.value.replace(/[^0-9]/g, ''));
              }}
              placeholder="0"
              inputMode="numeric"
            />
            {catalogValue === null ? (
              <span className="text-[10px] text-arc-dim">
                {isAmplified
                  ? 'No wiki price for amplified (Level 5) weapons — enter it yourself.'
                  : 'No wiki price for this weapon/tier — enter it yourself.'}
              </span>
            ) : (parseInt(weaponValue, 10) || 0) !== catalogValue ? (
              <button
                type="button"
                onClick={() => { setValueTouched(true); setWeaponValue(String(catalogValue)); }}
                className="text-[10px] text-arc-accent hover:underline"
              >
                Wiki price is {catalogValue.toLocaleString()} — use it
              </button>
            ) : (
              <span className="text-[10px] text-arc-dim">Wiki price for this tier.</span>
            )}
          </label>

          <label className="block">
            <span className="text-xs text-arc-dim uppercase tracking-wide">Quantity owned</span>
            <input
              className="input mt-1 w-full tabular-nums"
              value={quantity}
              onChange={e => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0"
              inputMode="numeric"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs text-arc-dim uppercase tracking-wide">
            Notes <span className="text-arc-dim/60 normal-case">(optional)</span>
          </span>
          <textarea
            className="input mt-1 w-full text-sm"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            maxLength={512}
          />
        </label>

        {/* Live totals so the value math is visible before saving. */}
        <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-arc-border/30 border border-arc-border">
          <span className="text-arc-muted">
            {(parseInt(weaponValue, 10) || 0).toLocaleString()} weapon
            {selectedMods.length > 0 && ` + ${modsValue.toLocaleString()} mods`}
            {' = '}
            <span className="text-arc-text font-medium tabular-nums">{unitValue.toLocaleString()}</span> each
          </span>
          <span className="text-arc-extra font-semibold tabular-nums">
            {totalValue.toLocaleString()} total
          </span>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button
            type="submit"
            disabled={saving || weaponId === ''}
            className="btn text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : config ? 'Save changes' : copyFrom ? 'Create copy' : 'Create build'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
