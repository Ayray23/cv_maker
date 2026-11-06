export const PENDING_CHECKOUT_STALE_AFTER_MS = 2 * 60 * 1000;

/**
 * An empty checkout URL means initialization never completed (or the process
 * died before persisting the URL). Treat malformed timestamps as stale so
 * they cannot permanently block a customer's next checkout attempt.
 */
export function isPendingCheckoutStale(createdAt: string, now = Date.now()) {
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return true;
  return now - createdAtMs >= PENDING_CHECKOUT_STALE_AFTER_MS;
}
