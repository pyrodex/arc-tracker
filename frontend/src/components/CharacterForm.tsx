import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Character, CreateCharacterPayload } from '../types';

const PRESET_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#a855f7', '#06b6d4', '#f97316', '#ec4899',
  '#84cc16', '#64748b',
];

const PRESET_LABELS = ['Wipe', 'Non-Wipe', 'Mule', 'PvP', 'PvE', 'HC', 'Leveling', 'Trade'];

interface Props {
  initial?: Character;
  onSubmit: (payload: CreateCharacterPayload) => void;
  onCancel: () => void;
  loading?: boolean;
}

function parseLabels(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map(l => l.trim()).filter(Boolean);
}

function joinLabels(labels: string[]): string | undefined {
  const joined = labels.join(', ');
  return joined || undefined;
}

export default function CharacterForm({ initial, onSubmit, onCancel, loading }: Props) {
  const [name, setName]     = useState(initial?.name ?? '');
  const [labels, setLabels] = useState<string[]>(parseLabels(initial?.label));
  const [customLabel, setCustomLabel] = useState('');
  const [notes, setNotes]   = useState(initial?.notes ?? '');
  const [color, setColor]   = useState(initial?.color ?? '#3b82f6');

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setLabels(parseLabels(initial.label));
      setNotes(initial.notes ?? '');
      setColor(initial.color);
    }
  }, [initial]);

  const toggleLabel = (l: string) =>
    setLabels(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);

  const addCustomLabel = () => {
    const trimmed = customLabel.trim();
    if (trimmed && !labels.includes(trimmed)) {
      setLabels(prev => [...prev, trimmed]);
    }
    setCustomLabel('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      label: joinLabels(labels),
      notes: notes.trim(),
      color,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-arc-muted mb-1.5">Character Name *</label>
        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Richie"
          maxLength={64}
          required
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-arc-muted mb-1.5">Labels</label>

        {/* Active labels */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {labels.map(l => (
              <span
                key={l}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                           bg-arc-accent/15 text-arc-accent border border-arc-accent/30"
              >
                {l}
                <button
                  type="button"
                  onClick={() => toggleLabel(l)}
                  className="hover:text-arc-danger transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Preset chips */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESET_LABELS.filter(l => !labels.includes(l)).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => toggleLabel(l)}
              className="px-2.5 py-1 rounded-full text-xs font-medium border border-arc-border
                         text-arc-muted hover:border-arc-accent/40 hover:text-arc-accent transition-colors"
            >
              + {l}
            </button>
          ))}
        </div>

        {/* Custom label */}
        <div className="flex gap-2">
          <input
            className="input"
            value={customLabel}
            onChange={e => setCustomLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomLabel(); } }}
            placeholder="Custom label…"
            maxLength={32}
          />
          <button
            type="button"
            onClick={addCustomLabel}
            disabled={!customLabel.trim()}
            className="btn-ghost border border-arc-border shrink-0"
          >
            Add
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-arc-muted mb-1.5">Color</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                color === c ? 'scale-110 border-white/80' : 'border-transparent hover:border-white/40'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          <div className="relative w-7 h-7">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Custom color"
            />
            <div
              className="w-7 h-7 rounded-full border-2 border-dashed border-arc-border flex items-center justify-center text-arc-dim text-xs hover:border-arc-muted"
              style={{ backgroundColor: PRESET_COLORS.includes(color) ? 'transparent' : color }}
            >
              {PRESET_COLORS.includes(color) ? '+' : ''}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-arc-muted mb-1.5">Notes</label>
        <textarea
          className="input resize-none"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional notes about this character…"
          maxLength={512}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading || !name.trim()}>
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Create Character'}
        </button>
      </div>
    </form>
  );
}
