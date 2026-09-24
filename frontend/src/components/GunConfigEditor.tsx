import { useEffect, useMemo, useState } from 'react';
import type { GunConfig, WeaponCatalog, WeaponModCatalog, WeaponPriceCatalog } from '../types';
import Modal from './Modal';

const TIERS = [1, 2, 3, 4];
const ROMAN = ['', 'I', 'II', 'III', 'IV'];

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
  onSave: (payload: {
    weapon_id: number;
    name: string | null;
    tier: number | null;
    weapon_value: number;
    quantity: number;
    notes: string | null;
    mod_ids: number[];
  }) => void;
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
    // A stored value is authoritative, whether editing or copying; only a
    // blank new build auto-fills from the wiki.
    setValueTouched(!!source);
  }, [open, config, copyFrom, source]);

  const weapons = weaponCatalog?.weapons ?? [];
  const selectedWeapon = weapons.find(w => w.id === weaponId);

  // Weapons that can't be upgraded have no tier; the field is disabled rather
  // than hidden so the reason stays visible.
  const canTier = selectedWeapon ? selectedWeapon.tiered === 1 : true;

  // The wiki price for the current weapon/tier. Tier 0 covers weapons that
  // cannot be upgraded; null means the wiki has no figure (e.g. Canto).
  const catalogValue = useMemo(() => {
    if (weaponId === '' || !priceCatalog) return null;
    const forWeapon = priceCatalog.prices[weaponId];
    if (!forWeapon) return null;
    return forWeapon[tier === '' ? 0 : tier] ?? null;
  }, [weaponId, tier, priceCatalog]);

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
    if (weaponId === '') return;
    onSave({
      weapon_id: weaponId,
      name: name.trim() || null,
      tier: canTier && tier !== '' ? tier : null,
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
              value={canTier ? tier : ''}
              disabled={!canTier}
              onChange={e => setTier(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">None</option>
              {TIERS.map(t => <option key={t} value={t}>{ROMAN[t]} ({t})</option>)}
            </select>
            {!canTier && selectedWeapon && (
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
