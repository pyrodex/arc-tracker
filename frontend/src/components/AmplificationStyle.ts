import type { AmplificationComponent } from '../types';

export interface AmpStyle {
  label: string;
  text: string;
  bg: string;
  border: string;
  badge: string;
}

/**
 * Modules are colored by the weapon rarity they amplify (Mk. I = common …
 * Mk. V = legendary); materials by their own rarity. Unknown falls back to neutral.
 */
const RARITY_STYLES: Record<string, AmpStyle> = {
  common:    { label: 'Common',    text: 'text-zinc-300',    bg: '',    border: 'border-zinc-500/40',    badge: 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30' },
  uncommon:  { label: 'Uncommon',  text: 'text-emerald-400', bg: '', border: 'border-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  rare:      { label: 'Rare',      text: 'text-sky-400',     bg: '',     border: 'border-sky-500/40',     badge: 'bg-sky-500/20 text-sky-400 border border-sky-500/30' },
  epic:      { label: 'Epic',      text: 'text-purple-400',  bg: '',  border: 'border-purple-500/40',  badge: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  legendary: { label: 'Legendary', text: 'text-amber-400',   bg: '',   border: 'border-amber-500/40',   badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
};

const UNKNOWN_STYLE: AmpStyle = {
  label: 'Unknown',
  text: 'text-arc-muted',
  bg: 'bg-arc-hover/40',
  border: 'border-arc-border',
  badge: 'bg-arc-border/60 text-arc-muted border border-arc-border',
};

export function ampStyle(c: Pick<AmplificationComponent, 'kind' | 'unlocks' | 'rarity'>): AmpStyle {
  const key = c.kind === 'module' ? c.unlocks : c.rarity;
  return (key && RARITY_STYLES[key]) || UNKNOWN_STYLE;
}

/** "Amplifies rare weapons" for modules; the rarity for materials. */
export function ampBadgeLabel(c: Pick<AmplificationComponent, 'kind' | 'unlocks' | 'rarity'>): string {
  if (c.kind === 'module') return c.unlocks ? `${ampStyle(c).label} weapons` : 'Module';
  return c.rarity ? ampStyle(c).label : 'Rarity unknown';
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

/** Short label for icon fallbacks: "Mk III" for modules, initials for materials. */
export function ampShortLabel(c: Pick<AmplificationComponent, 'kind' | 'tier' | 'name'>): string {
  if (c.kind === 'module' && c.tier) return `Mk ${ROMAN[c.tier] ?? c.tier}`;
  return c.name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}
