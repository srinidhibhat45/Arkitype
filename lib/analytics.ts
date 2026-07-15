/**
 * Thin wrapper around gtag for custom interaction events (button clicks,
 * gate outcomes, etc). No-ops when GA hasn't loaded (no measurement ID set,
 * or an ad-blocker dropped the script) so call sites never need to guard.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(action: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", action, params);
}
