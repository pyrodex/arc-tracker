import { Moon, Sun, Monitor } from 'lucide-react';
import type { ThemeMode } from '../hooks/useTheme';

interface Props {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const OPTIONS: { id: ThemeMode; icon: typeof Moon; label: string }[] = [
  { id: 'dark',   icon: Moon,    label: 'Dark'   },
  { id: 'light',  icon: Sun,     label: 'Light'  },
  { id: 'system', icon: Monitor, label: 'System' },
];

export default function ThemeToggle({ mode, setMode }: Props) {
  return (
    <div className="flex items-center gap-0.5 bg-arc-bg rounded-lg p-0.5 border border-arc-border">
      {OPTIONS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setMode(id)}
          title={label}
          className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors
            ${mode === id
              ? 'bg-arc-accent/20 text-arc-accent'
              : 'text-arc-dim hover:text-arc-muted'
            }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}
