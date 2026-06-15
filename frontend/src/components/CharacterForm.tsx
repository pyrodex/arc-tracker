import { useState, useEffect } from 'react';
import type { Character, CreateCharacterPayload } from '../types';

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#84cc16', // lime
  '#64748b', // slate
];

const PRESET_LABELS = ['Wipe', 'Non-Wipe', 'Mule', 'PvP', 'PvE', 'HC', 'Leveling', 'Trade'];

interface Props {
  initial?: Character;
  onSubmit: (payload: CreateCharacterPayload) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function CharacterForm({ initial, onSubmit, onCancel, loading }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [color, setColor] = useState(initial?.color ?? '#3b82f6');

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setLabel(initial.label ?? '');
      setNotes(initial.notes ?? '');
      setColor(initial.color);
    }
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), label: label.trim() || undefined, notes: notes.trim() || undefined, color });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Character Name *</label>
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
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Label</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {PRESET_LABELS.map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLabel(label === l ? '' : l)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                ${label === l
                  ? 'bg-arc-accent/20 text-arc-accent border-arc-accent/40'
                  : 'border-arc-border text-slate-400 hover:border-slate-500 hover:text-slate-200'
                }`}
            >
              {l}
            </button>
          ))}
        </div>
        <input
          className="input"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Custom label (or select above)"
          maxLength={32}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Color</label>
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
              className="w-7 h-7 rounded-full border-2 border-dashed border-arc-border flex items-center justify-center text-slate-500 text-xs hover:border-slate-400"
              style={{ backgroundColor: PRESET_COLORS.includes(color) ? 'transparent' : color }}
            >
              {PRESET_COLORS.includes(color) ? '+' : ''}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Notes</label>
        <textarea
          className="input resize-none"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional notes about this character..."
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
