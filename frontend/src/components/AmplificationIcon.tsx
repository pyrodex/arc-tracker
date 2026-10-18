import { useState } from 'react';
import type { AmplificationComponent } from '../types';
import { ampStyle, ampShortLabel } from './AmplificationStyle';

interface Props {
  component: Pick<AmplificationComponent, 'slug' | 'name' | 'kind' | 'tier' | 'unlocks' | 'rarity'>;
  size?: number;
}

type IconSrc = 'png' | 'webp' | 'svg' | 'fallback';

export default function AmplificationIcon({ component, size = 40 }: Props) {
  const [src, setSrc] = useState<IconSrc>('png');

  if (src === 'fallback') {
    const style = ampStyle(component);
    return (
      <div
        className={`rounded-lg flex flex-col items-center justify-center shrink-0 border ${style.bg} ${style.border}`}
        style={{ width: size, height: size }}
      >
        <span className="text-base leading-none">⚡</span>
        <span className={`text-[9px] font-bold mt-0.5 ${style.text}`}>{ampShortLabel(component)}</span>
      </div>
    );
  }

  const next: Record<IconSrc, IconSrc> = { png: 'webp', webp: 'svg', svg: 'fallback', fallback: 'fallback' };

  return (
    <img
      src={`/icons/${component.slug}.${src}`}
      alt={component.name}
      width={size}
      height={size}
      className="rounded-lg object-contain shrink-0"
      style={{ width: size, height: size }}
      onError={() => setSrc(prev => next[prev])}
    />
  );
}
