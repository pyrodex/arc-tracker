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
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <CategoryIcon category={category} size={size <= 28 ? 'sm' : 'md'} />;
  }

  return (
    <img
      src={`/icons/${slug}.png`}
      alt={name}
      width={size}
      height={size}
      className="rounded object-contain"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
