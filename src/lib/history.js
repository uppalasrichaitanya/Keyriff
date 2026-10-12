/* Test history. Lifetime stats (totals, streak, heatmap) are derived from
   this list, so it has to hold far more than the recent tests. Each result
   carries a per-second series (~5 KB), which would blow the localStorage
   quota at this depth, so only the newest FULL_DETAIL entries keep it. */
export const HISTORY_MAX = 2000
export const FULL_DETAIL = 50

function compact(r) {
  if (!r || r.history === undefined) return r
  const { history: _series, ...rest } = r
  return rest
}

export function addToHistory(prev, result) {
  const list = [{ ...result, events: [], words: [] }, ...(Array.isArray(prev) ? prev : [])]
  return list
    .slice(0, HISTORY_MAX)
    .map((r, i) => (i < FULL_DETAIL ? r : compact(r)))
}
