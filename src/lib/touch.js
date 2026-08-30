export const isTouchDevice = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(pointer: coarse)")?.matches ||
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window)

/* subtle haptic tick; no-op where unsupported */
export function buzz(ms = 4) {
  try {
    navigator.vibrate?.(ms)
  } catch {}
}
