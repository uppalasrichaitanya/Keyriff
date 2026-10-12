import { describe, test, expect } from "vitest"
import { WORDS, sampleWords, COMMON_SIZE } from "../src/lib/words.js"
import { generateTest, wordOpts, pbKey, formatMode } from "../src/lib/engine.js"

describe("word pools", () => {
  test("common draws only from the frequent head of the list", () => {
    const head = new Set(WORDS.slice(0, COMMON_SIZE))
    const out = sampleWords(300, { pool: "common" })
    expect(out.every((w) => head.has(w))).toBe(true)
  })

  test("rare draws only long, uncommon words", () => {
    const out = sampleWords(300, { pool: "rare" })
    const head = new Set(WORDS.slice(0, COMMON_SIZE))
    expect(out.every((w) => w.length >= 7 && !head.has(w))).toBe(true)
  })

  test("rare pool is big enough not to repeat constantly", () => {
    const rare = WORDS.filter((w, i) => i >= COMMON_SIZE && w.length >= 7)
    expect(rare.length).toBeGreaterThan(120)
  })

  test("pool composes with the word length filter", () => {
    const out = sampleWords(200, { pool: "common", max: 4 })
    expect(out.every((w) => w.length <= 4)).toBe(true)
  })

  test("default pool still uses every word", () => {
    expect(sampleWords(50).length).toBe(50)
  })
})

describe("wordOpts / generateTest / keys", () => {
  test("wordOpts merges length and pool", () => {
    expect(wordOpts({ wordLength: "short", wordPool: "common" })).toEqual({
      max: 4,
      pool: "common",
    })
    expect(wordOpts({ wordLength: "any" })).toEqual({})
    expect(wordOpts({ wordLength: "any", wordPool: "all" })).toEqual({})
  })

  test("generateTest respects the pool", () => {
    const head = new Set(WORDS.slice(0, COMMON_SIZE))
    const words = generateTest({
      mode: "words", wordValue: 100, wordLength: "any", wordPool: "common",
    })
    expect(words.every((w) => head.has(w))).toBe(true)
  })

  test("personal bests are tracked per pool", () => {
    const base = { mode: "time", timeValue: 30, wordLength: "any" }
    expect(pbKey({ ...base }, 50)).toBe("time-30")
    expect(pbKey({ ...base, wordPool: "all" }, 50)).toBe("time-30")
    expect(pbKey({ ...base, wordPool: "common" }, 50)).toBe("time-30-common")
    expect(pbKey({ ...base, wordPool: "rare" }, 50)).toBe("time-30-rare")
    expect(formatMode({ ...base, wordPool: "rare" }, 50)).toContain("rare")
  })
})
