import { describe, test, expect } from "vitest"
import {
  addToHistory,
  HISTORY_MAX,
  FULL_DETAIL,
} from "../src/lib/history.js"

const entry = (i) => ({
  wpm: 50 + (i % 10),
  accuracy: 97,
  timeSec: 30,
  timestamp: 1_700_000_000_000 + i * 1000,
  chars: { correct: 100, incorrect: 2, extra: 0, missed: 0 },
  history: [{ t: 1, wpm: 40, raw: 45 }],
  events: [],
  words: [],
})

describe("addToHistory", () => {
  test("puts the newest result first", () => {
    const out = addToHistory([entry(1)], entry(2))
    expect(out[0].timestamp).toBe(entry(2).timestamp)
    expect(out).toHaveLength(2)
  })

  test("keeps far more than 50 tests so lifetime stats stay correct", () => {
    let h = []
    for (let i = 0; i < 300; i++) h = addToHistory(h, entry(i))
    expect(h).toHaveLength(300)
  })

  test("caps total history at HISTORY_MAX", () => {
    let h = []
    for (let i = 0; i < HISTORY_MAX + 25; i++) h = addToHistory(h, entry(i))
    expect(h).toHaveLength(HISTORY_MAX)
    expect(h[0].timestamp).toBe(entry(HISTORY_MAX + 24).timestamp)
  })

  test("drops the per-second series from entries older than FULL_DETAIL", () => {
    let h = []
    for (let i = 0; i < FULL_DETAIL + 10; i++) h = addToHistory(h, entry(i))
    expect(h[0].history).toBeDefined()
    expect(h[FULL_DETAIL - 1].history).toBeDefined()
    expect(h[FULL_DETAIL].history).toBeUndefined()
    // compacted entries still carry what the stats page needs
    expect(h[FULL_DETAIL].wpm).toBeGreaterThan(0)
    expect(h[FULL_DETAIL].chars.correct).toBe(100)
  })

  test("tolerates a non-array previous value", () => {
    expect(addToHistory(null, entry(1))).toHaveLength(1)
  })
})
