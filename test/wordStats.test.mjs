import { describe, test, expect } from "vitest"
import { analyzeWords, summarizeWords } from "../src/lib/wordStats.js"

const type = (t0, word, step, wrongAt = -1) => {
  const ev = []
  let t = t0
  for (let i = 0; i < word.length; i++) {
    ev.push({ t, a: i === wrongAt ? "i" : "c", ch: word[i] })
    t += step
  }
  return { ev, end: t }
}

function script(parts) {
  const events = []
  let t = 0
  for (const { word, step, wrongAt } of parts) {
    const r = type(t, word, step, wrongAt)
    events.push(...r.ev)
    events.push({ t: r.end, a: "s" })
    t = r.end + step
  }
  return events
}

describe("analyzeWords", () => {
  test("times each completed word and ranks by ms per char", () => {
    const words = ["the", "quick", "fox"]
    const events = script([
      { word: "the", step: 100 },
      { word: "quick", step: 300 },
      { word: "fox", step: 100 },
    ])
    const out = analyzeWords(events, words)
    expect(out.map((w) => w.word)).toEqual(["the", "quick", "fox"])
    expect(out[1].msPerChar).toBeGreaterThan(out[0].msPerChar)
  })

  test("counts wrong keystrokes against the word they were typed in", () => {
    const words = ["cat", "dog"]
    const events = script([
      { word: "cat", step: 100, wrongAt: 1 },
      { word: "dog", step: 100 },
    ])
    const out = analyzeWords(events, words)
    expect(out[0].misses).toBe(1)
    expect(out[1].misses).toBe(0)
  })

  test("ignores the unfinished last word for timing", () => {
    const words = ["one", "two"]
    const events = [...script([{ word: "one", step: 100 }]), { t: 900, a: "c", ch: "t" }]
    expect(analyzeWords(events, words)).toHaveLength(1)
  })

  test("backspacing into the previous word keeps attribution correct", () => {
    const words = ["ab", "cd"]
    const events = [
      { t: 0, a: "c", ch: "a" },
      { t: 100, a: "i", ch: "x" },
      { t: 200, a: "s" }, // submitted wrong "ax"
      { t: 300, a: "b" }, // go back into word 0
      { t: 400, a: "b" }, // delete x
      { t: 500, a: "c", ch: "b" },
      { t: 600, a: "s" },
      { t: 700, a: "c", ch: "c" },
      { t: 800, a: "c", ch: "d" },
      { t: 900, a: "s" },
    ]
    const out = analyzeWords(events, words)
    expect(out.map((w) => w.word)).toEqual(["ab", "ab", "cd"].slice(0, out.length))
    expect(out.find((w) => w.word === "cd").misses).toBe(0)
    expect(out.find((w) => w.word === "ab").misses).toBe(1)
  })
})

describe("summarizeWords", () => {
  test("returns null when there is too little data", () => {
    expect(summarizeWords([{ word: "a", index: 0, ms: 100, msPerChar: 50, misses: 0 }])).toBeNull()
  })

  test("picks the slowest and most-missed words", () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      word: `w${i}x`,
      index: i,
      ms: 400,
      msPerChar: 100 + i * 10,
      misses: i === 3 ? 2 : i === 5 ? 1 : 0,
    }))
    const s = summarizeWords(rows)
    expect(s.slowest[0].word).toBe("w7x")
    expect(s.slowest).toHaveLength(3)
    expect(s.missed.map((w) => w.word)).toEqual(["w3x", "w5x"])
  })

  test("omits the missed list when the run was clean", () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      word: `w${i}`, index: i, ms: 300, msPerChar: 100 + i, misses: 0,
    }))
    expect(summarizeWords(rows).missed).toEqual([])
  })
})
