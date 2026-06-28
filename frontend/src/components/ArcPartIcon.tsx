import { useState } from 'react';
import type { ArcPartRarity } from '../types';

interface Props {
  slug: string;
  name: string;
  rarity: ArcPartRarity;
  size?: number;
}

type IconSrc = 'png' | 'webp' | 'svg' | 'fallback';

const rarityFallback: Record<ArcPartRarity, { bg: string; border: string; text: string; emoji: string }> = {
  legendary: { bg: 'bg-amber-900/30', border: 'border-amber-500/40', text: 'text-amber-400', emoji: '👑' },
  epic:      { bg: 'bg-purple-900/30', border: 'border-purple-500/40', text: 'text-purple-400', emoji: '⚡' },
};

function ArcPartFallback({ name, rarity, size }: { name: string; rarity: ArcPartRarity; size: number }) {
  const cfg      = rarityFallback[rarity];
  const initials = name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  return (
    <div
      className={`rounded-lg flex flex-col items-center justify-center shrink-0 border ${cfg.bg} ${cfg.border}`}
      style={{ width: size, height: size }}
    >
      <span className="text-base leading-none">{cfg.emoji}</span>
      <span className={`text-[9px] font-bold mt-0.5 ${cfg.text}`}>{initials}</span>
    </div>
  );
}

export default function ArcPartIcon({ slug, name, rarity, size = 40 }: Props) {
  const [src, setSrc] = useState<IconSrc>('png');

  if (src === 'fallback') {
    return <ArcPartFallback name={name} rarity={rarity} size={size} />;
  }

  const next: Record<IconSrc, IconSrc> = { png: 'webp', webp: 'svg', svg: 'fallback', fallback: 'fallback' };

  return (
    <img
      src={`/icons/${slug}.${src}`}
      alt={name}
      width={size}
      height={size}
      className="rounded-lg object-contain shrink-0"
      style={{ width: size, height: size }}
      onError={() => setSrc(prev => next[prev])}
    />
  );
}
