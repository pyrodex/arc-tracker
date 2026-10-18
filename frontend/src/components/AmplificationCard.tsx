import { useState, useRef, useEffect } from 'react';
import type { AmplificationComponent, AmplificationTrackingMap } from '../types';
import AmplificationIcon from './AmplificationIcon';
import { ampStyle, ampBadgeLabel } from './AmplificationStyle';

interface Props {
  component: AmplificationComponent;
  trackingMap: AmplificationTrackingMap;
  onSetCount: (componentId: number, count: number) => void;
}

export default function AmplificationCard({ component, trackingMap, onSetCount }: Props) {
  const count = trackingMap[component.id]?.count ?? 0;
  const style = ampStyle(component);
  const valueKnown = component.sell_value !== null;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.select();
  }, [editing]);

  const decrement = () => { if (count > 0)    onSetCount(component.id, count - 1); };
  const increment = () => { if (count < 9999) onSetCount(component.id, count + 1); };

  const commitEdit = () => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 9999) onSetCount(component.id, parsed);
    setEditing(false);
  };

  return (
    <div className={`card p-4 border ${style.border} ${count > 0 ? style.bg : ''} transition-all duration-200`}>
      <div className="flex items-start gap-3">
        <AmplificationIcon component={component} size={44} />

        <div className="flex-1 min-w-0">
          <p className="font-medium text-arc-text text-sm leading-snug">{component.name}</p>
          <p className="text-xs text-arc-dim mt-0.5 line-clamp-2" title={component.source ?? undefined}>
            {component.source ? `from ${component.source}` : 'Source unknown'}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${style.badge}`}>
              {ampBadgeLabel(component)}
            </span>
            <span className="text-[10px] text-arc-dim">
              {valueKnown ? `${component.sell_value!.toLocaleString()} ea` : 'value unknown'}
            </span>
          </div>
          {(component.weight !== null || component.stack_size !== null) && (
            <p className="text-[10px] text-arc-dim mt-1">
              {[
                component.weight !== null && `Weight ${component.weight}`,
                component.stack_size !== null && (component.stack_size > 1 ? `Stacks to ${component.stack_size}` : "Doesn't stack"),
              ].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-arc-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-arc-dim">Held</span>
          <div className="flex items-center gap-1">
            <button
              onClick={decrement}
              disabled={count <= 0}
              className="w-7 h-7 rounded-md flex items-center justify-center text-arc-muted hover:text-arc-text hover:bg-arc-hover border border-arc-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base leading-none"
              aria-label={`Decrease ${component.name}`}
            >−</button>

            {editing ? (
              <input
                ref={inputRef}
                type="number"
                min={0}
                max={9999}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditing(false);
                }}
                className={`w-14 text-center text-sm font-bold rounded-md border px-1 py-0.5 bg-arc-panel outline-none focus:ring-1 ${style.text} ${style.border}`}
              />
            ) : (
              <button
                onClick={() => { setDraft(String(count)); setEditing(true); }}
                className={`w-14 text-center text-sm font-bold rounded-md border px-1 py-1 transition-colors hover:opacity-80 ${style.text} ${style.border}`}
                title="Click to edit"
              >
                {count}
              </button>
            )}

            <button
              onClick={increment}
              disabled={count >= 9999}
              className="w-7 h-7 rounded-md flex items-center justify-center text-arc-muted hover:text-arc-text hover:bg-arc-hover border border-arc-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base leading-none"
              aria-label={`Increase ${component.name}`}
            >+</button>
          </div>
        </div>

        {count > 0 && valueKnown && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-arc-dim">Value</span>
            <span className={`text-xs font-semibold tabular-nums ${style.text}`}>
              {(count * component.sell_value!).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
