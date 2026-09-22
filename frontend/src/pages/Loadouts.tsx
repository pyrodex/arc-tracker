import { useCallback, useMemo, useState } from 'react';
import { Plus, Coins, Crosshair } from 'lucide-react';
import type { GunConfig } from '../types';
import {
  useBlueprints,
  useCharacters,
  useWeaponMods,
  useWeaponPrices,
  useGunConfigs,
  useCreateGunConfig,
  useUpdateGunConfig,
  useSetGunConfigQuantity,
  useDeleteGunConfig,
  useUpdateModPrice,
} from '../hooks/useApi';
import GunConfigCard from '../components/GunConfigCard';
import GunConfigEditor from '../components/GunConfigEditor';

export default function Loadouts() {
  const { data: characters = [] } = useCharacters();
  const { data: weapons = [] } = useBlueprints('weapons');
  const { data: catalog } = useWeaponMods();
  const { data: priceCatalog } = useWeaponPrices();

  const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<GunConfig | null>(null);
  const [showPrices, setShowPrices] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeCharId = selectedCharId ?? characters[0]?.id ?? null;
  const activeChar = characters.find(c => c.id === activeCharId);

  const { data: configs = [] } = useGunConfigs(activeCharId);
  const createConfig = useCreateGunConfig();
  const updateConfig = useUpdateGunConfig();
  const setQuantity = useSetGunConfigQuantity();
  const deleteConfig = useDeleteGunConfig();
  const updatePrice = useUpdateModPrice();

  const totals = useMemo(() => ({
    builds: configs.length,
    guns: configs.reduce((sum, c) => sum + c.quantity, 0),
    value: configs.reduce((sum, c) => sum + c.total_value, 0),
  }), [configs]);

  const handleQuantity = useCallback((id: number, delta: number) => {
    setQuantity.mutate({ id, delta });
  }, [setQuantity]);

  const handleSetQuantity = useCallback((id: number, quantity: number) => {
    setQuantity.mutate({ id, quantity });
  }, [setQuantity]);

  const handleDelete = useCallback((config: GunConfig) => {
    if (activeCharId === null) return;
    deleteConfig.mutate({ id: config.id, characterId: activeCharId });
  }, [deleteConfig, activeCharId]);

  const openEditor = (config: GunConfig | null) => {
    setEditing(config);
    setSaveError(null);
    setEditorOpen(true);
  };

  const handleSave = (payload: {
    blueprint_id: number;
    name: string | null;
    tier: number | null;
    weapon_value: number;
    quantity: number;
    notes: string | null;
    mod_ids: number[];
  }) => {
    setSaveError(null);
    const onError = (err: Error) => setSaveError(err.message);
    const onSuccess = () => { setEditorOpen(false); setEditing(null); };

    if (editing) {
      updateConfig.mutate({ id: editing.id, ...payload }, { onSuccess, onError });
    } else if (activeCharId !== null) {
      createConfig.mutate({ character_id: activeCharId, ...payload }, { onSuccess, onError });
    }
  };

  if (characters.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-arc-muted mb-3">No characters yet. Create a character first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-arc-border bg-arc-panel/50 shrink-0">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-arc-text">Loadouts</h1>
            <p className="text-xs text-arc-dim mt-0.5">Gun builds with mods, counts and value</p>
          </div>

          <div className="flex items-center gap-4">
            {totals.builds > 0 && (
              <div className="text-right">
                <p className="text-sm text-arc-muted">
                  <span className="text-arc-text font-medium">{totals.builds}</span> build{totals.builds === 1 ? '' : 's'}
                  {' · '}
                  <span className="text-arc-text font-medium">{totals.guns}</span> gun{totals.guns === 1 ? '' : 's'}
                </p>
                <p className="text-sm font-semibold text-arc-extra tabular-nums">
                  {totals.value.toLocaleString()} total value
                </p>
              </div>
            )}
            <button onClick={() => openEditor(null)} className="btn text-sm gap-1.5">
              <Plus className="w-4 h-4" /> New build
            </button>
          </div>
        </div>

        {/* Character selector */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-arc-dim uppercase tracking-wide shrink-0">Character:</span>
          <div className="flex flex-wrap gap-2">
            {characters.map(char => (
              <button
                key={char.id}
                onClick={() => setSelectedCharId(char.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                  ${activeCharId === char.id ? '' : 'border-arc-border text-arc-muted hover:text-arc-text hover:border-arc-muted/60'}`}
                style={activeCharId === char.id ? {
                  backgroundColor: char.color + '20',
                  borderColor: char.color + '60',
                  color: char.color,
                } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: activeCharId === char.id ? char.color : 'rgb(var(--arc-border))' }}
                />
                {char.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowPrices(v => !v)}
          className="btn-ghost text-xs gap-1.5 py-1.5"
        >
          <Coins className="w-3.5 h-3.5" />
          {showPrices ? 'Hide mod prices' : 'Set mod prices'}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6">
        {/* Mod price editor. Prices are per-install because no public source
            lists them, and they feed every build's value. */}
        {showPrices && catalog && (
          <section className="card p-4 mb-6">
            <h2 className="text-sm font-semibold text-arc-text mb-1">Mod prices</h2>
            <p className="text-xs text-arc-dim mb-3">
              Set once per mod — every build using it picks the value up. Unpriced mods count as zero.
            </p>
            <div className="space-y-4">
              {catalog.slots.map(slot => {
                const mods = catalog.mods.filter(m => m.slot === slot.slot);
                if (!mods.length) return null;
                return (
                  <div key={slot.slot}>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-arc-muted mb-2">
                      {slot.label}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {mods.map(mod => (
                        <label key={mod.id} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 truncate text-arc-muted" title={mod.name}>
                            {mod.name}
                            {!mod.craftable && <span className="text-amber-400 ml-1" title="Loot-only">◆</span>}
                          </span>
                          <input
                            className="input w-24 py-1 text-sm text-right tabular-nums"
                            defaultValue={mod.sell_value || ''}
                            placeholder="0"
                            inputMode="numeric"
                            onBlur={e => {
                              const next = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
                              if (next !== mod.sell_value) updatePrice.mutate({ id: mod.id, sell_value: next });
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                            aria-label={`${mod.name} value`}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {configs.length === 0 ? (
          <div className="text-center py-16">
            <Crosshair className="w-8 h-8 text-arc-dim mx-auto mb-3" />
            <p className="text-arc-muted mb-1">
              No builds for {activeChar?.name ?? 'this character'} yet.
            </p>
            <p className="text-xs text-arc-dim">
              Create one to track a weapon, its mods, how many you hold and what they're worth.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {configs.map(config => (
              <GunConfigCard
                key={config.id}
                config={config}
                slots={catalog?.slots ?? []}
                onQuantity={handleQuantity}
                onSetQuantity={handleSetQuantity}
                onEdit={openEditor}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {catalog && (
        <GunConfigEditor
          open={editorOpen}
          onClose={() => { setEditorOpen(false); setEditing(null); }}
          catalog={catalog}
          priceCatalog={priceCatalog}
          weapons={weapons}
          config={editing}
          saving={createConfig.isPending || updateConfig.isPending}
          error={saveError}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
