import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Character } from '../types';
import { useCharacters } from './useApi';

const STORAGE_KEY = 'arc-active-character';

interface ActiveCharacter {
  characters: Character[];
  /** The character every tracking page edits; null only when none exist. */
  activeCharId: number | null;
  activeChar: Character | undefined;
  setActiveCharId: (id: number) => void;
  isLoading: boolean;
}

const Ctx = createContext<ActiveCharacter | null>(null);

function readStored(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

/**
 * One character choice for the whole app. Picking "Alt" on Blueprints keeps
 * "Alt" selected on Workshop, Loadouts and after a reload. A `?character=<id>`
 * link selects that character on arrival.
 */
export function ActiveCharacterProvider({ children }: { children: ReactNode }) {
  const { data: characters = [], isLoading } = useCharacters();
  const [params] = useSearchParams();
  const [chosen, setChosen] = useState<number | null>(readStored);

  // A deep link wins over the remembered choice. Reports uses ?character= for
  // its own "All / one character" filter, so only adopt it when it names a
  // real character.
  const linked = Number(params.get('character'));
  useEffect(() => {
    if (linked && characters.some(c => c.id === linked) && linked !== chosen) setChosen(linked);
  }, [linked, characters, chosen]);

  const activeCharId = characters.some(c => c.id === chosen) ? chosen : characters[0]?.id ?? null;

  const setActiveCharId = useCallback((id: number) => {
    setChosen(id);
    try { localStorage.setItem(STORAGE_KEY, String(id)); } catch { /* private mode */ }
  }, []);

  const value = useMemo<ActiveCharacter>(() => ({
    characters,
    activeCharId,
    activeChar: characters.find(c => c.id === activeCharId),
    setActiveCharId,
    isLoading,
  }), [characters, activeCharId, setActiveCharId, isLoading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActiveCharacter(): ActiveCharacter {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useActiveCharacter must be used inside ActiveCharacterProvider');
  return ctx;
}
