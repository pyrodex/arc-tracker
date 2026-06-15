import type { BlueprintCategory } from '../types';

interface Props {
  category: BlueprintCategory;
  size?: 'sm' | 'md';
}

const CATEGORY_META: Record<BlueprintCategory, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  weapons:    { label: 'Weapon',    emoji: '🔫', bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30'    },
  mods:       { label: 'Mod',       emoji: '🔧', bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/30'   },
  explosives: { label: 'Explosive', emoji: '💣', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  medicine:   { label: 'Medicine',  emoji: '💊', bg: 'bg-green-500/15',  text: 'text-green-400',  border: 'border-green-500/30'  },
  augments:   { label: 'Augment',   emoji: '🧠', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  utility:    { label: 'Utility',   emoji: '⚡', bg: 'bg-cyan-500/15',   text: 'text-cyan-400',   border: 'border-cyan-500/30'   },
  crafting:   { label: 'Crafting',  emoji: '⚙️', bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

export function categoryMeta(category: BlueprintCategory) {
  return CATEGORY_META[category] ?? CATEGORY_META.crafting;
}

export default function CategoryIcon({ category, size = 'md' }: Props) {
  const meta = categoryMeta(category);
  const dim = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';
  return (
    <div className={`${dim} rounded-lg ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0`}>
      <span role="img" aria-label={meta.label}>{meta.emoji}</span>
    </div>
  );
}

export function CategoryBadge({ category }: { category: BlueprintCategory }) {
  const meta = categoryMeta(category);
  return (
    <span className={`badge ${meta.bg} ${meta.text} border ${meta.border}`}>
      {meta.emoji} {meta.label}
    </span>
  );
}
