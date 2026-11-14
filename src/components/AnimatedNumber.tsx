import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { useEffect } from 'react';

type AnimatedNumberProps = {
  value: number;
  /** Turns the (rounded) number into display text, e.g. a currency string. */
  format?: (value: number) => string;
  className?: string;
};

/**
 * Counts smoothly to a new value. Screen readers get the final value once,
 * not every frame of the count.
 */
export function AnimatedNumber({ value, format = String, className }: AnimatedNumberProps) {
  const reduced = useReducedMotion();
  const current = useMotionValue(value);
  const text = useTransform(current, (latest) => format(Math.round(latest)));

  useEffect(() => {
    if (reduced) {
      current.set(value);
      return;
    }
    const controls = animate(current, value, { duration: 0.45, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [current, reduced, value]);

  return (
    <span className={className}>
      <span className="sr-only">{format(value)}</span>
      <motion.span aria-hidden="true">{text}</motion.span>
    </span>
  );
}
