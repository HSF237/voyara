import { useEffect, useRef, type RefObject } from 'react';

/**
 * Shared behaviour for Modal and Sheet:
 *  - focus moves into the dialog when it opens and back to the trigger on close
 *  - Tab / Shift+Tab stay inside the dialog
 *  - Escape closes the top-most dialog only
 *  - the page behind is made inert and stops scrolling
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const stack: symbol[] = [];

function lockPage() {
  if (stack.length !== 1) return;
  // Pad by the scrollbar's width so the page doesn't jump sideways when it disappears.
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbar > 0) document.documentElement.style.paddingInlineEnd = `${scrollbar}px`;
  document.documentElement.style.overflow = 'hidden';
  document.getElementById('root')?.setAttribute('inert', '');
}

function unlockPage() {
  if (stack.length !== 0) return;
  document.documentElement.style.overflow = '';
  document.documentElement.style.paddingInlineEnd = '';
  document.getElementById('root')?.removeAttribute('inert');
}

export function useDialogBehaviour(
  open: boolean,
  onClose: () => void,
  panelRef: RefObject<HTMLElement | null>,
  dismissible = true,
) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const id = Symbol('dialog');
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    stack.push(id);
    lockPage();

    const panel = panelRef.current;
    const initial = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel;
    initial?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (stack[stack.length - 1] !== id) return;

      if (event.key === 'Escape') {
        if (!dismissible) return;
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = stack.indexOf(id);
      if (index !== -1) stack.splice(index, 1);
      unlockPage();
      trigger?.focus({ preventScroll: true });
    };
  }, [open, dismissible, panelRef]);
}
