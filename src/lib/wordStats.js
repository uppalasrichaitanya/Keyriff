/* Per-word timing and mistakes, rebuilt from the keystroke log.
   Events: { t (ms), a: "c" | "i" | "s" | "b", ch }. A backspace on an
   empty word steps back into the previous one, so the walk tracks how
   long each word was when it was submitted. */
export function analyzeWords(events, words) {
  const out = []
  const lens = []
  const misses = {}
  let wi = 0
  let len = 0
  let startT = null
  for (const ev of events ?? []) {
    if (startT === null) startT = ev.t
    if (ev.a === "c") {
      len++
    } else if (ev.a === "i") {
      len++
      misses[wi] = (misses[wi] ?? 0) + 1
    } else if (ev.a === "b") {
      if (len > 0) len--
      else if (wi > 0) {
        wi--
        len = lens[wi] ?? 0
      }
    } else if (ev.a === "s") {
      lens[wi] = len
      const word = words?.[wi]
      if (word) {
        const ms = Math.max(1, ev.t - startT)
        out.push({
          word,
          index: wi,
          ms,
          msPerChar: ms / (word.length + 1),
          misses: misses[wi] ?? 0,
        })
      }
      wi++
      len = 0
      startT = ev.t
    }
  }
  return out
}

const MIN_WORDS = 6

export function summarizeWords(rows) {
  if (!rows || rows.length < MIN_WORDS) return null
  const slowest = [...rows]
    .sort((a, b) => b.msPerChar - a.msPerChar)
    .slice(0, 3)
  const missed = rows
    .filter((r) => r.misses > 0)
    .sort((a, b) => b.misses - a.misses || b.msPerChar - a.msPerChar)
    .slice(0, 3)
  return { slowest, missed }
}
