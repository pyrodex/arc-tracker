import { useState } from 'react';
import type { StencilRarity } from '../types';
import { stencilRarityMeta } from './StencilRarity';

interface Props {
  slug: string;
  name: string;
  rarity: StencilRarity;
  size?: number;
}

type IconSrc = 'png' | 'webp' | 'svg' | 'fallback';

function StencilFallback({ name, rarity, size }: { name: string; rarity: StencilRarity; size: number }) {
  const meta     = stencilRarityMeta(rarity);
  const initials = name.replace(/\s+Stencil$/i, '').split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  return (
    <div
      className={`rounded-lg flex flex-col items-center justify-center shrink-0 border ${meta.bg} ${meta.border}`}
      style={{ width: size, height: size }}
    >
      <span className="text-base leading-none">🎨</span>
      <span className={`text-xs font-bold mt-0.5 ${meta.text}`}>{initials}</span>
    </div>
  );
}

export default function StencilIcon({ slug, name, rarity, size = 40 }: Props) {
  const [src, setSrc] = useState<IconSrc>('png');

  if (src === 'fallback') {
    return <StencilFallback name={name} rarity={rarity} size={size} />;
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
