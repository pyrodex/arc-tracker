import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Users } from 'lucide-react';
import { useActiveCharacter } from '../hooks/useActiveCharacter';

function labelText(label: string | null, max = 2) {
  if (!label) return null;
  const parts = label.split(',').map(l => l.trim()).filter(Boolean);
  return parts.length ? parts.slice(0, max).join(', ') : null;
}

/**
 * The character every tracking page edits. The choice is shared across pages
 * and remembered between visits, so it only needs picking once.
 */
export default function CharacterSwitcher({ className = '' }: { className?: string }) {
  const { characters, activeChar, setActiveCharId } = useActiveCharacter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!activeChar) return null;
  const single = characters.length === 1;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !single && setOpen(o => !o)}
        aria-haspopup={single ? undefined : 'menu'}
        aria-expanded={single ? undefined : open}
        className={`flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-lg text-sm font-medium border transition-colors
          ${single ? 'cursor-default' : 'hover:brightness-110'}`}
        style={{
          backgroundColor: activeChar.color + '20',
          borderColor: activeChar.color + '60',
          color: activeChar.color,
        }}
        title={single ? 'Tracking for this character' : 'Switch character — applies to every page'}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activeChar.color }} />
        <span className="truncate max-w-[12rem]">{activeChar.name}</span>
        {labelText(activeChar.label) && (
          <span className="text-xs opacity-70 hidden sm:inline truncate max-w-[10rem]">· {labelText(activeChar.label)}</span>
        )}
        {!single && <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1.5 z-40 w-64 max-h-80 overflow-auto card shadow-2xl p-1 animate-fade-in"
        >
          {characters.map(char => {
            const active = char.id === activeChar.id;
            return (
              <button
                key={char.id}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => { setActiveCharId(char.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm transition-colors
                  ${active ? 'bg-arc-hover text-arc-text' : 'text-arc-muted hover:bg-arc-hover hover:text-arc-text'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: char.color }} />
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-medium">{char.name}</span>
                  {labelText(char.label, 3) && (
                    <span className="block truncate text-xs text-arc-dim">{labelText(char.label, 3)}</span>
                  )}
                </span>
                {active && <Check className="w-4 h-4 text-arc-accent shrink-0" />}
              </button>
            );
          })}
          <div className="border-t border-arc-border mt-1 pt-1">
            <Link
              to="/characters"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-arc-muted hover:bg-arc-hover hover:text-arc-text"
            >
              <Users className="w-3.5 h-3.5" /> Manage characters
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
