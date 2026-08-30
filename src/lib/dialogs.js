/* ref-counted registry of open popovers/modals — lets the global
   hotkey handler skip restart logic without touching the DOM */
let count = 0

export function dialogOpen() {
  count++
}

export function dialogClose() {
  count = Math.max(0, count - 1)
}

export function anyDialogOpen() {
  return count > 0
}
