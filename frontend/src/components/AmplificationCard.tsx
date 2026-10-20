import CountStepper from './CountStepper';
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
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-sm ${style.badge}`}>
              {ampBadgeLabel(component)}
            </span>
            <span className="text-xs text-arc-dim">
              {valueKnown ? `${component.sell_value!.toLocaleString()} ea` : 'value unknown'}
            </span>
          </div>
          {(component.weight !== null || component.stack_size !== null) && (
            <p className="text-xs text-arc-dim mt-1">
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
          <CountStepper value={count} onChange={n => onSetCount(component.id, n)} name={component.name} valueClassName={`${style.text} ${style.border}`} />
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
