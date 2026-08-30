import { sampleWords, sampleWordsSeeded, mulberry32, WORDS } from "./words.js"
import { sampleQuote } from "./quotes.js"
import { charForCode } from "./keys.js"

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function dailySeed(d = new Date()) {
  const key = dateKey(d)
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function isTimedMode(mode) {
  return mode === "time" || mode === "daily"
}

export function wordLenOpts(wordLength) {
  if (wordLength === "short") return { max: 4 }
  if (wordLength === "long") return { min: 6 }
  return {}
}

export function generateTest(settings) {
  const { mode, timeValue, wordValue, punctuation, numbers, wordLength } = settings
  if (mode === "quote") {
    return sampleQuote().text.trim().split(/\s+/)
  }
  if (mode === "custom") {
    const t = (settings.customText || "").trim()
    if (t) return t.split(/\s+/)
  }
  if (mode === "daily") {
    /* deterministic test of the day — same words for everyone, always punctuated */
    const rng = mulberry32(dailySeed())
    return applyPunctuation(sampleWordsSeeded(120, dailySeed()), rng)
  }
  const count =
    mode === "time" ? Math.max(50, timeValue * 4) : wordValue
  let words = sampleWords(count, wordLenOpts(wordLength))
  if (numbers) words = applyNumbers(words)
  if (punctuation) words = applyPunctuation(words)
  return words
}

function randomDigits(rng) {
  const len = 2 + ((rng() * 3) | 0)
  let s = ""
  for (let i = 0; i < len; i++) s += (rng() * 10) | 0
  return s
}

export function applyNumbers(words, rng = Math.random) {
  return words.map((w, i) =>
    i > 0 && rng() < 0.14 ? randomDigits(rng) : w
  )
}

export function applyPunctuation(words, rng = Math.random) {
  const out = []
  let sinceStop = 2 + ((rng() * 5) | 0)
  for (let i = 0; i < words.length; i++) {
    let w = words[i]
    if (sinceStop <= 0) {
      w = capitalize(w) + sentenceEnd(rng)
      sinceStop = 3 + ((rng() * 6) | 0)
    } else {
      const roll = rng()
      if (roll < 0.1) {
        w = capitalize(w)
      } else if (roll < 0.18 && i < words.length - 1 && sinceStop > 2) {
        w = w + ","
      } else if (roll < 0.21) {
        w = "'" + w + "'"
      } else if (roll < 0.24 && i < words.length - 1 && sinceStop > 2) {
        w = w + ";"
      }
      sinceStop--
    }
    if (i === words.length - 1 && !/[.!?;,]$/.test(w)) w = w + "."
    out.push(w)
  }
  return out
}

function capitalize(w) {
  return w[0].toUpperCase() + w.slice(1)
}

function sentenceEnd(rng) {
  const r = rng()
  if (r < 0.7) return "."
  if (r < 0.85) return "?"
  return "!"
}

export function weakKeys(keyStats, limit = 8) {
  const keys = []
  for (const [code, s] of Object.entries(keyStats)) {
    const total = (s?.ok || 0) + (s?.bad || 0)
    if (total < 5) continue
    const acc = (s.ok || 0) / total
    if (acc >= 0.96) continue
    const ch = charForCode(code)
    if (!ch) continue
    keys.push({ code, ch, acc, total })
  }
  keys.sort((a, b) => a.acc - b.acc)
  return keys.slice(0, limit)
}

export function sampleWeakWords(keyStats, n = 30) {
  const weak = weakKeys(keyStats)
  if (!weak.length) return sampleWords(n)
  const pool = []
  for (const w of WORDS) {
    const lower = w.toLowerCase()
    if (weak.some((k) => k.ch !== " " && lower.includes(k.ch))) pool.push(w)
  }
  if (!pool.length) return sampleWords(n)
  const out = []
  let i = (Math.random() * pool.length) | 0
  let guard = 0
  while (out.length < n && guard < n * 20) {
    out.push(pool[i % pool.length])
    i += 1 + ((Math.random() * 3) | 0)
    guard++
  }
  while (out.length < n) out.push(sampleWords(1)[0])
  return out
}

export function computeConsistency(rawSeries) {
  const vals = rawSeries.filter((v) => v > 0)
  if (vals.length < 2) return vals.length === 1 ? 100 : 0
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const variance =
    vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length
  const sd = Math.sqrt(variance)
  if (mean === 0) return 0
  return Math.max(0, Math.min(100, Math.round((1 - sd / mean) * 100)))
}

export function computeMissed(words, typed, limit) {
  let missed = 0
  const end = Math.min(words.length, limit ?? words.length)
  for (let i = 0; i < end; i++) {
    const t = typed[i] ?? ""
    missed += Math.max(0, words[i].length - t.length)
  }
  return missed
}

export function pbKey(settings, wordCount) {
  if (settings.mode === "quote") {
    const bucket = wordCount < 18 ? "short" : wordCount < 32 ? "medium" : "long"
    return `quote-${bucket}`
  }
  if (settings.mode === "custom") {
    const bucket = wordCount < 18 ? "short" : wordCount < 32 ? "medium" : "long"
    return `custom-${bucket}`
  }
  if (settings.mode === "daily") {
    return `daily-${dateKey()}`
  }
  const base =
    settings.mode === "time"
      ? `time-${settings.timeValue}`
      : `words-${settings.wordValue}`
  let key = settings.punctuation ? `${base}-punct` : base
  if (settings.numbers) key = `${key}-num`
  if (settings.wordLength && settings.wordLength !== "any")
    key = `${key}-${settings.wordLength}`
  return key
}

export function formatMode(settings, wordCount) {
  if (settings.mode === "quote") {
    return `quote · ${wordCount ?? "?"} words`
  }
  if (settings.mode === "custom") {
    return `custom · ${wordCount ?? "?"} words`
  }
  if (settings.mode === "daily") {
    return `daily challenge · ${dateKey()}`
  }
  const base =
    settings.mode === "time"
      ? `time ${settings.timeValue}`
      : `${settings.wordValue} words`
  let label = settings.punctuation ? `${base} · punct` : base
  if (settings.numbers) label = `${label} · num`
  if (settings.wordLength && settings.wordLength !== "any")
    label = `${label} · ${settings.wordLength}`
  return label
}
