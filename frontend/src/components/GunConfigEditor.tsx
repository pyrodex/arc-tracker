import { useEffect, useMemo, useState } from 'react';
import type { Blueprint, GunConfig, WeaponModCatalog, WeaponPriceCatalog } from '../types';
import Modal from './Modal';

const TIERS = [1, 2, 3, 4];
const ROMAN = ['', 'I', 'II', 'III', 'IV'];

interface Props {
  open: boolean;
  onClose: () => void;
  catalog: WeaponModCatalog;
  /** Seeded wiki prices, used to auto-fill the weapon value field. */
  priceCatalog: WeaponPriceCatalog | undefined;
  weapons: Blueprint[];
  /** null puts the editor in create mode. */
  config: GunConfig | null;
  saving: boolean;
  error: string | null;
  onSave: (payload: {
    blueprint_id: number;
    name: string | null;
    tier: number | null;
    weapon_value: number;
    quantity: number;
    notes: string | null;
    mod_ids: number[];
  }) => void;
}

export default function GunConfigEditor({
  open, onClose, catalog, priceCatalog, weapons, config, saving, error, onSave,
}: Props) {
  const [blueprintId, setBlueprintId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState<number | ''>('');
  const [weaponValue, setWeaponValue] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  // One mod id per slot — the shape the one-per-slot rule implies.
  const [slotPicks, setSlotPicks] = useState<Record<string, number | ''>>({});
  // Once the value field is edited by hand, stop auto-filling it from the wiki.
  const [valueTouched, setValueTouched] = useState(false);

  // Reload the form whenever the editor opens or switches config.
  useEffect(() => {
    if (!open) return;
    setBlueprintId(config?.blueprint_id ?? '');
    setName(config?.name ?? '');
    setTier(config?.tier ?? '');
    setWeaponValue(config ? String(config.weapon_value) : '');
    setQuantity(config ? String(config.quantity) : '0');
    setNotes(config?.notes ?? '');
    setSlotPicks(Object.fromEntries((config?.mods ?? []).map(m => [m.slot, m.id])));
    // An existing build's stored value is authoritative; a new one auto-fills.
    setValueTouched(!!config);
  }, [open, config]);

  // The wiki price for the current weapon/tier. Tier 0 covers weapons that
  // cannot be upgraded; null means the wiki has no figure (e.g. Canto).
  const catalogValue = useMemo(() => {
    if (blueprintId === '' || !priceCatalog) return null;
    const forWeapon = priceCatalog.prices[blueprintId];
    if (!forWeapon) return null;
    return forWeapon[tier === '' ? 0 : tier] ?? null;
  }, [blueprintId, tier, priceCatalog]);

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

  const modsValue = selectedMods.reduce((sum, m) => sum + m.sell_value, 0);
  const unitValue = (parseInt(weaponValue, 10) || 0) + modsValue;
  const totalValue = unitValue * (parseInt(quantity, 10) || 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (blueprintId === '') return;
    onSave({
      blueprint_id: blueprintId,
      name: name.trim() || null,
      tier: tier === '' ? null : tier,
      weapon_value: parseInt(weaponValue, 10) || 0,
      quantity: parseInt(quantity, 10) || 0,
      notes: notes.trim() || null,
      mod_ids: selectedMods.map(m => m.id),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={config ? 'Edit build' : 'New build'}
      width="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-arc-dim uppercase tracking-wide">Weapon</span>
            <select
              className="input mt-1 w-full"
              value={blueprintId}
              onChange={e => setBlueprintId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">Select a weapon…</option>
              {weapons.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-arc-dim uppercase tracking-wide">Tier</span>
            <select
              className="input mt-1 w-full"
              value={tier}
              onChange={e => setTier(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">None (legendaries can't be upgraded)</option>
              {TIERS.map(t => <option key={t} value={t}>{ROMAN[t]} ({t})</option>)}
            </select>
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
                <span className="text-[11px] text-arc-muted">{slot.label}</span>
                <select
                  className="input mt-1 w-full text-sm"
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
                No wiki price for this weapon/tier — enter it yourself.
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
            disabled={saving || blueprintId === ''}
            className="btn text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : config ? 'Save changes' : 'Create build'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
