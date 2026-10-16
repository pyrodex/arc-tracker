import type { StencilRarity } from '../types';

/** Rarities from best to worst — the order used for sorting and filters. */
export const STENCIL_RARITIES: StencilRarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

const RARITY_META: Record<StencilRarity, { label: string; bg: string; text: string; border: string }> = {
  legendary: { label: 'Legendary', bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30'   },
  epic:      { label: 'Epic',      bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30' },
  rare:      { label: 'Rare',      bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/30'     },
  uncommon:  { label: 'Uncommon',  bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  common:    { label: 'Common',    bg: 'bg-zinc-500/15',    text: 'text-zinc-400',    border: 'border-zinc-500/30'    },
};

export function stencilRarityMeta(rarity: StencilRarity) {
  return RARITY_META[rarity] ?? RARITY_META.common;
}

export function StencilRarityBadge({ rarity }: { rarity: StencilRarity }) {
  const meta = stencilRarityMeta(rarity);
  return (
    <span className={`badge ${meta.bg} ${meta.text} border ${meta.border}`}>
      {meta.label}
    </span>
  );
}

/** Split the stored comma-separated weapon list into names. */
export function stencilWeapons(weapons: string | null): string[] {
  return (weapons ?? '').split(',').map(w => w.trim()).filter(Boolean);
}
