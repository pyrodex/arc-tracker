import { useState } from 'react';
import type { BlueprintCategory } from '../types';
import CategoryIcon from './CategoryIcon';

interface Props {
  slug: string;
  name: string;
  category: BlueprintCategory;
  size?: number;
}

type IconSrc = 'png' | 'webp' | 'svg' | 'fallback';

export default function BlueprintIcon({ slug, name, category, size = 40 }: Props) {
  const [src, setSrc] = useState<IconSrc>('png');

  if (src === 'fallback') {
    const catSize = size >= 48 ? 'lg' : size <= 28 ? 'sm' : 'md';
    return <CategoryIcon category={category} size={catSize} />;
  }

  const next: Record<IconSrc, IconSrc> = { png: 'webp', webp: 'svg', svg: 'fallback', fallback: 'fallback' };

  return (
    <img
      src={`/icons/${slug}.${src}`}
      alt={name}
      width={size}
      height={size}
      className="rounded-sm object-contain"
      style={{ width: size, height: size }}
      onError={() => setSrc(prev => next[prev])}
    />
  );
}
