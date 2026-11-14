import { forwardRef, useId, type CSSProperties, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type SliderProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'min' | 'max' | 'step'
> & {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** How the value is shown and read aloud, e.g. "RM 1,200". */
  formatValue?: (value: number) => string;
};

/** Native range input, restyled — keyboard and screen-reader behaviour come built in. */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    label,
    value,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    formatValue,
    className,
    id,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const display = formatValue ? formatValue(value) : String(value);
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
        <output htmlFor={inputId} className="text-sm font-semibold text-ink tabular-nums">
          {display}
        </output>
      </div>
      <input
        ref={ref}
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={(event) => onValueChange(Number(event.target.value))}
        className="vy-slider rounded-full"
        style={{ '--fill': `${fill}%` } as CSSProperties}
        {...rest}
      />
    </div>
  );
});
