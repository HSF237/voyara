import { motion } from 'framer-motion';
import {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

type TabsContextValue = {
  value: string;
  select: (value: string) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(component: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`<${component}> must be used inside <Tabs>`);
  return context;
}

const idFor = (baseId: string, kind: 'tab' | 'panel', value: string) =>
  `${baseId}-${kind}-${value.replace(/\s+/g, '-')}`;

export type TabsProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  /** Controlled value. Omit and pass defaultValue for uncontrolled use. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
};

export function Tabs({ value, defaultValue = '', onValueChange, children, ...rest }: TabsProps) {
  const baseId = useId();
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;

  const context = useMemo<TabsContextValue>(
    () => ({
      value: current,
      baseId,
      select: (next) => {
        if (value === undefined) setInternal(next);
        onValueChange?.(next);
      },
    }),
    [baseId, current, onValueChange, value],
  );

  return (
    <TabsContext.Provider value={context}>
      <div {...rest}>{children}</div>
    </TabsContext.Provider>
  );
}

export type TabListProps = HTMLAttributes<HTMLDivElement> & {
  /** Names the set of tabs for screen readers, e.g. "Trip days". */
  'aria-label': string;
};

/**
 * Arrow keys move between tabs (mirrored in right-to-left languages), Home and
 * End jump to the ends. Only the selected tab is in the Tab order.
 */
export function TabList({ className, onKeyDown, ...rest }: TabListProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    const list = event.currentTarget;
    const tabs = Array.from(
      list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
    );
    const index = tabs.findIndex((tab) => tab === document.activeElement);
    if (index === -1 || tabs.length === 0) return;

    const rtl = getComputedStyle(list).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';

    let next: number;
    if (event.key === forward) next = (index + 1) % tabs.length;
    else if (event.key === backward) next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;

    event.preventDefault();
    const target = tabs[next];
    target?.focus();
    target?.click();
  }

  return (
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- focus is managed on the tabs (roving tabindex)
    <div
      role="tablist"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={cn(
        'flex [scrollbar-width:none] gap-1 overflow-x-auto border-b border-line',
        className,
      )}
      {...rest}
    />
  );
}

export type TabProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> & {
  value: string;
};

export function Tab({ value, className, children, onClick, ...rest }: TabProps) {
  const { value: current, select, baseId } = useTabs('Tab');
  const selected = current === value;

  return (
    <button
      type="button"
      role="tab"
      id={idFor(baseId, 'tab', value)}
      aria-selected={selected}
      aria-controls={idFor(baseId, 'panel', value)}
      tabIndex={selected ? 0 : -1}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) select(value);
      }}
      className={cn(
        'relative h-11 shrink-0 rounded-sm px-3 text-sm font-semibold whitespace-nowrap transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        selected ? 'text-ink' : 'text-muted hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
      {selected && (
        <motion.span
          layoutId={`${baseId}-underline`}
          className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

export type TabPanelProps = HTMLAttributes<HTMLDivElement> & { value: string };

export function TabPanel({ value, className, children, ...rest }: TabPanelProps) {
  const { value: current, baseId } = useTabs('TabPanel');
  if (current !== value) return null;

  return (
    <div
      role="tabpanel"
      id={idFor(baseId, 'panel', value)}
      aria-labelledby={idFor(baseId, 'tab', value)}
      // Focusable so keyboard users can reach panels that have no controls inside.
      tabIndex={0}
      className={cn('pt-4', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
