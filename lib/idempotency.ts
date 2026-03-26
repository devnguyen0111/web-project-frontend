export function createIdempotencyKey(prefix = "req") {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function getSessionIdempotencyKey(storageKey: string, prefix = "req") {
  if (typeof window === "undefined") {
    return createIdempotencyKey(prefix);
  }

  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const next = createIdempotencyKey(prefix);
  window.sessionStorage.setItem(storageKey, next);
  return next;
}

export function clearSessionIdempotencyKey(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(storageKey);
}
