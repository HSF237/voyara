type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Run `callback` when the browser has nothing urgent to do, or after
 * `timeoutMs` at the latest. Returns a function that cancels it.
 * (Safari has no requestIdleCallback, so a short timer stands in.)
 */
export function onIdle(callback: () => void, timeoutMs: number): () => void {
  const idleWindow = window as IdleWindow;
  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: timeoutMs });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }
  const timer = setTimeout(callback, Math.min(timeoutMs, 600));
  return () => clearTimeout(timer);
}
