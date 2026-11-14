import { create } from 'zustand';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger';

export type ToastOptions = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds before it disappears. 0 keeps it until dismissed. */
  duration?: number;
  /** One optional action, e.g. "Undo". */
  action?: { label: string; onClick: () => void };
};

export type ToastItem = ToastOptions & { id: string; tone: ToastTone; duration: number };

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 4500;

export const useToastStore = create<{ toasts: ToastItem[] }>(() => ({ toasts: [] }));

let counter = 0;

/** Show a toast from anywhere (components, services, event handlers). Returns its id. */
export function toast(options: ToastOptions): string {
  const id = `toast-${++counter}`;
  const item: ToastItem = { tone: 'neutral', duration: DEFAULT_DURATION, ...options, id };
  useToastStore.setState((state) => ({ toasts: [...state.toasts, item].slice(-MAX_VISIBLE) }));
  return id;
}

export function dismissToast(id: string): void {
  useToastStore.setState((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }));
}

export function clearToasts(): void {
  useToastStore.setState({ toasts: [] });
}
