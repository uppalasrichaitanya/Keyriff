import { describe, test, expect } from "vitest"
import {
  generateTest,
  applyPunctuation,
  applyNumbers,
  computeConsistency,
  computeMissed,
  pbKey,
  formatMode,
  weakKeys,
  sampleWeakWords,
} from "../src/lib/engine.js"
import { sampleWords, WORDS } from "../src/lib/words.js"
import { QUOTES, sampleQuote } from "../src/lib/quotes.js"
import { charForCode, targetsFor } from "../src/lib/keys.js"

const settings = { mode: "time", timeValue: 30, wordValue: 25, punctuation: false }

describe("typing engine", () => {
  test("sampleWords returns n words from the list", () => {
    const words = sampleWords(25)
    expect(words.length).toBe(25)
    expect(words.every((w) => WORDS.includes(w))).toBe(true)
  })

  test("sampleWords avoids near repeats", () => {
    const ws = sampleWords(60)
    expect(new Set(ws.slice(0, 20)).size >= 15).toBe(true)
  })

  test("word list is large", () => {
    expect(WORDS.length >= 600).toBe(true)
  })

  test("applyPunctuation preserves count and ends sentences", () => {
    const punct = applyPunctuation(["the", "quick", "brown", "fox", "jumps"])
    expect(punct.length).toBe(5)
    expect(/[.!?,;']/.test(punct[4])).toBe(true)
    expect(punct.every((w) => typeof w === "string" && w.length >= 1)).toBe(true)
  })

  test("applyNumbers keeps first word, injects 2-4 digit numbers", () => {
    const numWords = applyNumbers(Array.from({ length: 100 }, (_, i) => `w${i}x`))
    expect(numWords[0]).toMatch(/^\D/)
    const digits = numWords.filter((w) => /^\d+$/.test(w))
    expect(digits.length > 0).toBe(true)
    expect(digits.every((w) => w.length >= 2 && w.length <= 4)).toBe(true)
  })

  test("generateTest time mode generates >=50 words", () => {
    expect(generateTest(settings).length >= 50).toBe(true)
  })

  test("generateTest words mode generates exactly n words", () => {
    expect(generateTest({ ...settings, mode: "words", wordValue: 10 }).length).toBe(10)
  })

  test("generateTest punct mode adds punctuation", () => {
    const t = generateTest({ ...settings, punctuation: true })
    expect(t.some((w) => /[.!?';]/.test(w) || w[0] !== w[0].toLowerCase())).toBe(true)
  })

  test("generateTest quote mode splits a quote", () => {
    const q = sampleQuote()
    expect(q.text.length > 12 && typeof q.source === "string" && q.source.length > 1).toBe(true)
    const qt = generateTest({ ...settings, mode: "quote" })
    expect(qt.join(" ").length > 12).toBe(true)
  })

  test("quote collection is large", () => {
    expect(QUOTES.length >= 40).toBe(true)
  })

  test("computeConsistency", () => {
    expect(computeConsistency([80, 80, 80, 80])).toBe(100)
    expect(computeConsistency([0, 0, 0])).toBe(0)
    const c = computeConsistency([60, 100])
    expect(c > 0 && c < 100).toBe(true)
  })

  test("computeMissed counts remaining chars of typed words", () => {
    expect(computeMissed(["hello", "world", "foo"], ["hell", "wor"])).toBe(1 + 2 + 3)
  })

  test("computeMissed limit caps counting to reached words", () => {
    expect(computeMissed(["hello", "world", "foo"], ["hell", "wor"], 2)).toBe(3)
    expect(computeMissed(["hello", "world"], ["hell", "wor"], 99)).toBe(3)
  })

  test("pbKey buckets", () => {
    expect(pbKey(settings)).toBe("time-30")
    expect(
      pbKey({ ...settings, mode: "words", wordValue: 50, punctuation: true })
    ).toBe("words-50-punct")
    expect(pbKey({ ...settings, numbers: true })).toBe("time-30-num")
    expect(pbKey({ mode: "quote" }, 10)).toBe("quote-short")
    expect(pbKey({ mode: "quote" }, 25)).toBe("quote-medium")
    expect(pbKey({ mode: "quote" }, 40)).toBe("quote-long")
    expect(pbKey({ mode: "custom" }, 10)).toBe("custom-short")
    expect(pbKey({ mode: "custom" }, 25)).toBe("custom-medium")
    expect(pbKey({ mode: "custom" }, 40)).toBe("custom-long")
  })

  test("formatMode", () => {
    expect(formatMode({ mode: "quote" }, 12).includes("quote")).toBe(true)
    expect(formatMode(settings)).toBe("time 30")
  })

  test("wpm math: 500 correct chars in 60s = 100 wpm", () => {
    const correctChars = 500
    const minutes = 60 / 60
    expect(Math.round((correctChars / 5 / minutes) * 10) / 10).toBe(100)
  })

  test("weakKeys ranks by accuracy and filters low samples", () => {
    const keyStats = {
      KeyM: { ok: 8, bad: 4 },
      KeyJ: { ok: 9, bad: 1 },
      KeyF: { ok: 2, bad: 0 },
      Minus: { ok: 4, bad: 2 },
    }
    const weak = weakKeys(keyStats, 8)
    expect(weak.length >= 2).toBe(true)
    expect(weak[0].code).toBe("KeyM")
    expect(weak.every((k) => k.total >= 5)).toBe(true)
    expect(!weak.some((k) => k.code === "KeyF")).toBe(true)
  })

  test("sampleWeakWords returns n words biased to weak keys", () => {
    const keyStats = { KeyM: { ok: 10, bad: 6 }, KeyA: { ok: 10, bad: 5 } }
    const words = sampleWeakWords(keyStats, 30)
    expect(words.length).toBe(30)
    expect(words.every((w) => WORDS.includes(w))).toBe(true)
    const biased = words.filter((w) => /[ma]/i.test(w)).length
    expect(biased >= words.length * 0.8).toBe(true)
  })

  test("sampleWeakWords falls back to normal words when no data", () => {
    const words = sampleWeakWords({}, 10)
    expect(words.length).toBe(10)
    expect(words.every((w) => WORDS.includes(w))).toBe(true)
  })

  test("targetsFor and charForCode agree on letters, digits, symbols", () => {
    expect(targetsFor("a").codes).toEqual(["KeyA"])
    expect(targetsFor("5").codes).toEqual(["Digit5"])
    expect(targetsFor("?").codes).toEqual(["Slash"])
    expect(targetsFor("?").shift).toBe(true)
    expect(charForCode("KeyA")).toBe("a")
    expect(charForCode("Digit5")).toBe("5")
    expect(charForCode("Space")).toBe(" ")
    expect(charForCode("Minus")).toBe("-")
    expect(charForCode("Escape")).toBe(null)
  })
})
