import test from "node:test"
import assert from "node:assert/strict"
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

test("sampleWords returns n words from the list", () => {
  const words = sampleWords(25)
  assert.equal(words.length, 25)
  assert.ok(words.every((w) => WORDS.includes(w)))
})

test("sampleWords avoids near repeats", () => {
  const ws = sampleWords(60)
  assert.ok(new Set(ws.slice(0, 20)).size >= 15)
})

test("word list is large", () => {
  assert.ok(WORDS.length >= 600)
})

test("applyPunctuation preserves count and ends sentences", () => {
  const punct = applyPunctuation(["the", "quick", "brown", "fox", "jumps"])
  assert.equal(punct.length, 5)
  assert.ok(/[.!?,;']/.test(punct[4]))
  assert.ok(punct.every((w) => typeof w === "string" && w.length >= 1))
})

test("applyNumbers keeps first word, injects 2-4 digit numbers", () => {
  const numWords = applyNumbers(Array.from({ length: 100 }, (_, i) => `w${i}x`))
  assert.match(numWords[0], /^\D/)
  const digits = numWords.filter((w) => /^\d+$/.test(w))
  assert.ok(digits.length > 0)
  assert.ok(digits.every((w) => w.length >= 2 && w.length <= 4))
})

test("generateTest time mode generates >=50 words", () => {
  assert.ok(generateTest(settings).length >= 50)
})

test("generateTest words mode generates exactly n words", () => {
  assert.equal(generateTest({ ...settings, mode: "words", wordValue: 10 }).length, 10)
})

test("generateTest punct mode adds punctuation", () => {
  const t = generateTest({ ...settings, punctuation: true })
  assert.ok(t.some((w) => /[.!?';]/.test(w) || w[0] !== w[0].toLowerCase()))
})

test("generateTest quote mode splits a quote", () => {
  const q = sampleQuote()
  assert.ok(q.text.length > 12 && typeof q.source === "string" && q.source.length > 1)
  const qt = generateTest({ ...settings, mode: "quote" })
  assert.ok(qt.join(" ").length > 12)
})

test("quote collection is large", () => {
  assert.ok(QUOTES.length >= 40)
})

test("computeConsistency", () => {
  assert.equal(computeConsistency([80, 80, 80, 80]), 100)
  assert.equal(computeConsistency([0, 0, 0]), 0)
  const c = computeConsistency([60, 100])
  assert.ok(c > 0 && c < 100)
})

test("computeMissed counts remaining chars of typed words", () => {
  assert.equal(
    computeMissed(["hello", "world", "foo"], ["hell", "wor"]),
    1 + 2 + 3
  )
})

test("computeMissed limit caps counting to reached words", () => {
  assert.equal(computeMissed(["hello", "world", "foo"], ["hell", "wor"], 2), 3)
  assert.equal(computeMissed(["hello", "world"], ["hell", "wor"], 99), 3)
})

test("pbKey buckets", () => {
  assert.equal(pbKey(settings), "time-30")
  assert.equal(
    pbKey({ ...settings, mode: "words", wordValue: 50, punctuation: true }),
    "words-50-punct"
  )
  assert.equal(pbKey({ ...settings, numbers: true }), "time-30-num")
  assert.equal(pbKey({ mode: "quote" }, 10), "quote-short")
  assert.equal(pbKey({ mode: "quote" }, 25), "quote-medium")
  assert.equal(pbKey({ mode: "quote" }, 40), "quote-long")
  assert.equal(pbKey({ mode: "custom" }, 10), "custom-short")
  assert.equal(pbKey({ mode: "custom" }, 25), "custom-medium")
  assert.equal(pbKey({ mode: "custom" }, 40), "custom-long")
})

test("formatMode", () => {
  assert.ok(formatMode({ mode: "quote" }, 12).includes("quote"))
  assert.equal(formatMode(settings), "time 30")
})

test("wpm math: 500 correct chars in 60s = 100 wpm", () => {
  const correctChars = 500
  const minutes = 60 / 60
  assert.equal(Math.round((correctChars / 5 / minutes) * 10) / 10, 100)
})

test("weakKeys ranks by accuracy and filters low samples", () => {
  const keyStats = {
    KeyM: { ok: 8, bad: 4 },
    KeyJ: { ok: 9, bad: 1 },
    KeyF: { ok: 2, bad: 0 },
    Minus: { ok: 4, bad: 2 },
  }
  const weak = weakKeys(keyStats, 8)
  assert.ok(weak.length >= 2)
  assert.equal(weak[0].code, "KeyM")
  assert.ok(weak.every((k) => k.total >= 5))
  assert.ok(!weak.some((k) => k.code === "KeyF"))
})

test("sampleWeakWords returns n words biased to weak keys", () => {
  const keyStats = { KeyM: { ok: 10, bad: 6 }, KeyA: { ok: 10, bad: 5 } }
  const words = sampleWeakWords(keyStats, 30)
  assert.equal(words.length, 30)
  assert.ok(words.every((w) => WORDS.includes(w)))
  const biased = words.filter((w) => /[ma]/i.test(w)).length
  assert.ok(biased >= words.length * 0.8)
})

test("sampleWeakWords falls back to normal words when no data", () => {
  const words = sampleWeakWords({}, 10)
  assert.equal(words.length, 10)
  assert.ok(words.every((w) => WORDS.includes(w)))
})

test("targetsFor and charForCode agree on letters, digits, symbols", () => {
  assert.deepEqual(targetsFor("a").codes, ["KeyA"])
  assert.deepEqual(targetsFor("5").codes, ["Digit5"])
  assert.deepEqual(targetsFor("?").codes, ["Slash"])
  assert.equal(targetsFor("?").shift, true)
  assert.equal(charForCode("KeyA"), "a")
  assert.equal(charForCode("Digit5"), "5")
  assert.equal(charForCode("Space"), " ")
  assert.equal(charForCode("Minus"), "-")
  assert.equal(charForCode("Escape"), null)
})
