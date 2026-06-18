import { useState } from 'react';
import type { BlueprintCategory } from '../types';
import CategoryIcon from './CategoryIcon';

interface Props {
  slug: string;
  name: string;
  category: BlueprintCategory;
  size?: number;
}

export default function BlueprintIcon({ slug, name, category, size = 40 }: Props) {
  // Try PNG first, then SVG placeholder, then CategoryIcon
  const [src, setSrc] = useState<'png' | 'svg' | 'fallback'>('png');

  if (src === 'fallback') {
    return <CategoryIcon category={category} size={size <= 28 ? 'sm' : 'md'} />;
  }

  return (
    <img
      src={src === 'png' ? `/icons/${slug}.png` : `/icons/${slug}.svg`}
      alt={name}
      width={size}
      height={size}
      className="rounded object-contain"
      style={{ width: size, height: size }}
      onError={() => setSrc(prev => prev === 'png' ? 'svg' : 'fallback')}
    />
  );
}
