import { useState } from 'react';

interface Props {
  slug: string;
  name: string;
  size?: number;
}

type IconSrc = 'png' | 'webp' | 'svg' | 'fallback';

function WorkshopMaterialFallback({ name, size }: { name: string; size: number }) {
  const initials = name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  return (
    <div
      className="rounded-lg flex flex-col items-center justify-center shrink-0 border bg-arc-hover/60 border-arc-border"
      style={{ width: size, height: size }}
    >
      <span className="text-base leading-none">⚙️</span>
      <span className="text-[9px] font-bold mt-0.5 text-arc-muted">{initials}</span>
    </div>
  );
}

export default function WorkshopMaterialIcon({ slug, name, size = 36 }: Props) {
  const [src, setSrc] = useState<IconSrc>('png');

  if (src === 'fallback') {
    return <WorkshopMaterialFallback name={name} size={size} />;
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
