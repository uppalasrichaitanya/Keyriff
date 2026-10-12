import { useCallback, useEffect, useRef, useState } from "react"
import {
  generateTest,
  applyPunctuation,
  applyNumbers,
  computeConsistency,
  computeMissed,
  formatMode,
  pbKey,
  wordOpts,
  isTimedMode,
  dateKey,
  dailySeed,
} from "../lib/engine"
import { sampleWords, sampleWordsSeeded } from "../lib/words"

function hasErrorBefore(cur, target) {
  for (let i = 0; i < cur.length; i++) {
    if (cur[i] !== target[i]) return true
  }
  return false
}

function wordHasError(cur, target) {
  for (let i = 0; i < target.length; i++) {
    if (cur[i] !== target[i]) return true
  }
  return false
}

export function useTypingEngine(settings, handlers = {}) {
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const [words, setWords] = useState(() => generateTest(settings))
  const [typed, setTyped] = useState([""])
  const [status, setStatus] = useState("idle")
  const [stats, setStats] = useState({ correct: 0, incorrect: 0, extra: 0 })
  const [errorTick, setErrorTick] = useState(0)
  const [capsLock, setCapsLock] = useState(false)
  const [series, setSeries] = useState([])

  /* clock kept outside react state: per-frame updates only notify
     subscribers (live stats, progress bar) so the app tree
     doesn't re-render 60x a second */
  const clockRef = useRef({ value: 0, subs: new Set() }).current
  const subscribeClock = useCallback(
    (cb) => {
      clockRef.subs.add(cb)
      return () => clockRef.subs.delete(cb)
    },
    [clockRef]
  )
  const getClock = useCallback(() => clockRef.value, [clockRef])
  const getLimit = useCallback(() => clockRef.limit ?? Infinity, [clockRef])

  const wordsRef = useRef(words)
  wordsRef.current = words
  const typedRef = useRef([""])
  const statusRef = useRef("idle")
  const countersRef = useRef({ correct: 0, incorrect: 0, extra: 0 })
  const startRef = useRef(0)
  const lastSnapRef = useRef(0)
  const prevErrorsRef = useRef(0)
  const seriesRef = useRef([])
  const eventsRef = useRef([])
  const finishedRef = useRef(false)
  const metaRef = useRef(null)

  function syncStats() {
    setStats({ ...countersRef.current })
  }

  function logEvent(a, ch) {
    eventsRef.current.push({
      t: Math.round(performance.now() - startRef.current),
      a,
      ch,
    })
  }

  function commit(next) {
    typedRef.current = next
    setTyped(next)
  }

  function ensureStart() {
    if (statusRef.current !== "idle") return
    statusRef.current = "running"
    finishedRef.current = false
    startRef.current = performance.now()
    lastSnapRef.current = 0
    prevErrorsRef.current = 0
    seriesRef.current = []
    const s = settingsRef.current
    clockRef.limit = metaRef.current?.durationSec
      ? metaRef.current.durationSec * 1000
      : isTimedMode(s.mode)
        ? s.timeValue * 1000
        : Infinity
    /* capture the daily key at start so a test that crosses
       midnight still records under the day it began */
    if (s.mode === "daily" && !metaRef.current) {
      metaRef.current = {
        key: `daily-${dateKey()}`,
        label: `daily challenge · ${dateKey()}`,
      }
    }
    setStatus("running")
  }

  function pushSnapshots(elapsedMs) {
    const sec = Math.floor(elapsedMs / 1000)
    /* a backgrounded tab can leave a huge gap — coalesce it */
    if (sec - lastSnapRef.current > 60) lastSnapRef.current = sec - 1
    let added = false
    while (lastSnapRef.current < sec) {
      lastSnapRef.current++
      const tSec = lastSnapRef.current
      const minutes = tSec / 60
      const c = countersRef.current
      const totalTyped = c.correct + c.incorrect + c.extra
      const errors = c.incorrect + c.extra - prevErrorsRef.current
      prevErrorsRef.current = c.incorrect + c.extra
      seriesRef.current.push({
        t: tSec,
        wpm: Math.round(Math.max(0, (c.correct / 5 / minutes) || 0)),
        raw: Math.round(Math.max(0, (totalTyped / 5 / minutes) || 0)),
        err: errors,
      })
      added = true
    }
    if (added) setSeries([...seriesRef.current])
  }

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    statusRef.current = "finished"
    setStatus("finished")

    const s = settingsRef.current
    const ms = performance.now() - startRef.current
    const meta = metaRef.current
    const timeSec =
      meta?.durationSec ??
      (isTimedMode(s.mode) ? s.timeValue : Math.max(1, ms / 1000))
    const minutes = timeSec / 60
    const c = { ...countersRef.current }
    const totalTyped = c.correct + c.incorrect + c.extra

    const result = {
      wpm: Math.round((totalTyped > 0 ? c.correct / 5 / minutes : 0) * 10) / 10,
      rawWpm:
        Math.round((totalTyped > 0 ? totalTyped / 5 / minutes : 0) * 10) / 10,
      accuracy:
        Math.round(
          (totalTyped > 0 ? (c.correct / totalTyped) * 100 : 0) * 10
        ) / 10,
      consistency: computeConsistency(seriesRef.current.map((p) => p.raw)),
      chars: {
        correct: c.correct,
        incorrect: c.incorrect,
        extra: c.extra,
        missed: computeMissed(
          wordsRef.current,
          typedRef.current,
          typedRef.current.length
        ),
      },
      timeSec: Math.round(timeSec * 10) / 10,
      modeLabel: meta?.label ?? formatMode(s, wordsRef.current.length),
      key: meta?.key ?? pbKey(s, wordsRef.current.length),
      history: [...seriesRef.current],
      events: [...eventsRef.current],
      words: wordsRef.current.slice(
        0,
        Math.min(wordsRef.current.length, typedRef.current.length + 60)
      ),
      timestamp: Date.now(),
    }
    handlersRef.current?.onFinish?.(result)
  }, [])

  useEffect(() => {
    if (status !== "running") return
    let raf
    const tick = () => {
      /* a restart/practice-start may have happened since this frame
         was scheduled — never touch state for a dead test */
      if (statusRef.current !== "running") return
      const el = performance.now() - startRef.current
      clockRef.value = el
      for (const cb of [...clockRef.subs]) {
        try {
          cb()
        } catch {}
      }
      pushSnapshots(el)
      const limitMs = clockRef.limit ?? Infinity
      if (el >= limitMs) {
        finish()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [status, finish, clockRef])

  function doChar(ch) {
    ensureStart()
    if (statusRef.current !== "running") return
    const arr = typedRef.current
    const wi = arr.length - 1
    const cur = arr[wi]
    const target = wordsRef.current[wi]
    if (
      settingsRef.current.forceCorrect &&
      hasErrorBefore(cur, target)
    ) {
      setErrorTick((t) => t + 1)
      handlersRef.current?.onError?.()
      return
    }
    if (cur.length >= target.length) {
      if (cur.length >= target.length + 8) return
      countersRef.current.extra++
      setErrorTick((t) => t + 1)
      handlersRef.current?.onError?.()
      logEvent("i", ch)
      const dead = settingsRef.current.suddenDeath
      const next = arr.slice()
      next[wi] = cur + ch
      commit(next)
      syncStats()
      if (dead) finish()
      return
    } else if (ch === target[cur.length]) {
      countersRef.current.correct++
      handlersRef.current?.onChar?.(ch)
      logEvent("c", ch)
    } else {
      countersRef.current.incorrect++
      setErrorTick((t) => t + 1)
      handlersRef.current?.onError?.()
      logEvent("i", ch)
      const dead = settingsRef.current.suddenDeath
      const next = arr.slice()
      next[wi] = cur + ch
      commit(next)
      syncStats()
      if (dead) finish()
      return
    }
    const next = arr.slice()
    next[wi] = cur + ch
    commit(next)
    syncStats()
  }

    function extendIfNeeded(wi) {
    const s = settingsRef.current
    if (isTimedMode(s.mode) || metaRef.current?.generate) {
      if (wi > wordsRef.current.length - 20) {
        const gen = metaRef.current?.generate
        let more
        if (gen) {
          more = gen(30)
        } else if (s.mode === "daily") {
          /* deterministic continuation: same words for everyone */
          more = applyPunctuation(
            sampleWordsSeeded(30, dailySeed() ^ (wi + 1))
          )
        } else {
          more = sampleWords(30, wordOpts(s))
          if (s.numbers) more = applyNumbers(more)
          if (s.punctuation) more = applyPunctuation(more)
        }
        setWords((prev) => prev.concat(more))
      }
    }
  }

  function doSpace() {
    if (statusRef.current !== "running") return
    const arr = typedRef.current
    const wi = arr.length - 1
    const cur = arr[wi]
    if (!cur) return
    if (
      settingsRef.current.forceCorrect &&
      wordHasError(cur, wordsRef.current[wi])
    ) {
      setErrorTick((t) => t + 1)
      handlersRef.current?.onError?.()
      return
    }
    countersRef.current.correct++
    handlersRef.current?.onSpace?.()
    logEvent("s")
    if (wi >= wordsRef.current.length - 1) {
      commit(arr.slice())
      finish()
      return
    }
    const next = arr.slice()
    next.push("")
    commit(next)
    extendIfNeeded(wi)
    syncStats()
  }

  function doBackspace() {
    if (statusRef.current !== "running") return
    const arr = typedRef.current
    const wi = arr.length - 1
    if (arr[wi].length > 0) {
      const next = arr.slice()
      next[wi] = arr[wi].slice(0, -1)
      commit(next)
      logEvent("b")
    } else if (wi > 0 && arr[wi - 1] !== wordsRef.current[wi - 1]) {
      commit(arr.slice(0, -1))
      logEvent("b")
    }
  }

  function dispatchKey(e) {
    if (e.getModifierState) setCapsLock(e.getModifierState("CapsLock"))
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (statusRef.current === "finished") return
    if (e.key === "Backspace") {
      e.preventDefault()
      doBackspace()
      return
    }
    if (e.key === " ") {
      e.preventDefault()
      if (!e.repeat) doSpace()
      return
    }
    if (e.key.length !== 1 || e.repeat) return
    e.preventDefault()
    doChar(e.key)
  }

  const handleKeyDown = useCallback((e) => {
    const t = e.target
    if (
      t &&
      (t.tagName === "TEXTAREA" ||
        t.tagName === "INPUT" ||
        t.isContentEditable)
    ) {
      return
    }
    dispatchKey(e)
  }, [])

  const resetAll = useCallback(() => {
    metaRef.current = null
    wordsRef.current = generateTest(settingsRef.current)
    setWords(wordsRef.current)
    typedRef.current = [""]
    setTyped([""])
    countersRef.current = { correct: 0, incorrect: 0, extra: 0 }
    setStats({ correct: 0, incorrect: 0, extra: 0 })
    statusRef.current = "idle"
    setStatus("idle")
    startRef.current = 0
    clockRef.value = 0
    clockRef.limit = Infinity
    clockRef.subs.forEach((cb) => cb())
    setErrorTick(0)
    finishedRef.current = false
    seriesRef.current = []
    eventsRef.current = []
    lastSnapRef.current = 0
    prevErrorsRef.current = 0
    setSeries([])
  }, [clockRef])

  const restart = resetAll

  const startWith = useCallback(
    (list, meta) => {
      metaRef.current = meta || null
      wordsRef.current = list
      setWords(list)
      typedRef.current = [""]
      setTyped([""])
      countersRef.current = { correct: 0, incorrect: 0, extra: 0 }
      setStats({ correct: 0, incorrect: 0, extra: 0 })
      statusRef.current = "idle"
      setStatus("idle")
      startRef.current = 0
      clockRef.value = 0
      clockRef.limit = Infinity
      clockRef.subs.forEach((cb) => cb())
      setErrorTick(0)
      finishedRef.current = false
      seriesRef.current = []
      eventsRef.current = []
      lastSnapRef.current = 0
      prevErrorsRef.current = 0
      setSeries([])
    },
    [clockRef]
  )

  /* REACTIVE AMBIENCE: rolling speed for backdrop energy.
     Average raw wpm of the last 3 series entries; 0 when idle/finished/empty. */
  const rollingWpm =
    status !== "running" || series.length === 0
      ? 0
      : series.slice(-3).reduce((acc, e) => acc + (e?.raw ?? 0), 0) /
        Math.min(3, series.length)

  return {
    words,
    typed,
    status,
    stats,
    errorTick,
    capsLock,
    series,
    rollingWpm,
    handleKeyDown,
    dispatchKey,
    restart,
    startWith,
    subscribeClock,
    getClock,
    getLimit,
  }
}
