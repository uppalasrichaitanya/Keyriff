import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, MotionConfig } from "framer-motion"
import TopBar from "./components/TopBar"
import ConfigBar from "./components/ConfigBar"
import TypingTest from "./components/TypingTest"
import ProgressBar from "./components/ProgressBar"
import LiveStats from "./components/LiveStats"
import ResultScreen from "./components/ResultScreen"
import StatsPage from "./components/StatsPage"
import Keyboard from "./components/Keyboard"
import Footer from "./components/Footer"
import TouchInput from "./components/TouchInput"
import KbStylePicker from "./components/KbStylePicker"
import MatrixRain from "./components/MatrixRain"
import { isTouchDevice, buzz } from "./lib/touch"
import { useLocalStorage } from "./hooks/useLocalStorage"
import { useTypingEngine } from "./hooks/useTypingEngine"
import { useShowcase } from "./hooks/useShowcase"
import { applyTheme, getTheme, ambientFor } from "./lib/themes"
import { rowOfChar, colOfChar, targetsFor } from "./lib/keys"
import { sampleWeakWords } from "./lib/engine"
import { addToHistory, HISTORY_MAX } from "./lib/history"
import { screenMotion } from "./lib/motion"
import { anyDialogOpen } from "./lib/dialogs"
import {
  playError,
  playFinish,
  playKey,
  playRecord,
  playSpace,
  setPack,
  setSoundEnabled,
  setVolume,
  DEFAULT_PACK,
} from "./lib/sound"

const DEFAULT_SETTINGS = {
  mode: "time",
  timeValue: 30,
  wordValue: 25,
  punctuation: false,
  numbers: false,
  sound: true,
  volume: 85,
  pack: DEFAULT_PACK,
  customText: "",
  showHeat: false,
  forceCorrect: false,
  wordLength: "any",
  wordPool: "all",
  fontSize: "m",
  kbStyle: "laser",
  suddenDeath: false,
  ghost: false,
  calm: false,
  moreOpen: false,
}

function RestartIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

function ZenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

function ShrinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  )
}

export default function App() {
  const [settings, setSettings] = useLocalStorage(
    "typer:v2:settings",
    DEFAULT_SETTINGS
  )
  const [themeId, setThemeId] = useLocalStorage("typer:v2:theme", "ghost")
  const [pbs, setPbs] = useLocalStorage("typer:v2:pbs", {})
  const [history, setHistory] = useLocalStorage("typer:v2:history", [])
  const [keyStats, setKeyStats] = useLocalStorage("typer:v2:keystats", {})
  const [screen, setScreen] = useState("test")
  const [lastResult, setLastResult] = useState(null)
  const [blurred, setBlurred] = useState(false)
  const [zen, setZen] = useState(false)
  const [seenIntro, setSeenIntro] = useLocalStorage(
    "typer:v2:seen-intro",
    false
  )
  const mainRef = useRef(null)

  const isTouch = useMemo(() => isTouchDevice(), [])
  const focusInputRef = useRef(null)
  const keyStatsRef = useRef(keyStats)
  keyStatsRef.current = keyStats

  const registerFocus = useCallback((fn) => {
    focusInputRef.current = fn
  }, [])

  const pbsRef = useRef(pbs)
  pbsRef.current = pbs

  const theme = getTheme(themeId)
  const calm = settings.calm === true

  useEffect(() => {
    document.documentElement.dataset.calm = calm ? "1" : ""
  }, [calm])

  /* zen is a test-screen-only mode */
  useEffect(() => {
    if (screen !== "test") setZen(false)
  }, [screen])

  useEffect(() => {
    applyTheme(themeId)
  }, [themeId])

  /* pause ambient animations when tab hidden (perf) */
  useEffect(() => {
    const onVis = () => {
      document.querySelector(".bgfx")?.classList.toggle("paused", document.hidden)
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])

  /* single source of truth for the board: CSS dataset + JSX geometry
     can never disagree (stale saves fall back to laser everywhere) */
  const kbStyle = ["laser", "spectre", "onyx", "deck", "monolith", "halo"].includes(
    settings.kbStyle
  )
    ? settings.kbStyle
    : "laser"

  useEffect(() => {
    document.documentElement.dataset.kb = kbStyle
  }, [kbStyle])

  useEffect(() => {
    setSoundEnabled(settings.sound)
  }, [settings.sound])

  useEffect(() => {
    setVolume((settings.volume ?? 70) / 100)
  }, [settings.volume])

  useEffect(() => {
    setPack(settings.pack ?? "tactile")
  }, [settings.pack])

  /* one-time: move old thock default to the new premium tactile pack */
  useEffect(() => {
    try {
      if (!localStorage.getItem("typer:v2:tactile-migrated")) {
        localStorage.setItem("typer:v2:tactile-migrated", "1")
        setSettings((s) => (s.pack === "thock" ? { ...s, pack: "tactile" } : s))
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const engine = useTypingEngine(settings, {
    onChar: (ch) => {
      if (!settings.sound) return
      buzz(4)
      playKey({ row: rowOfChar(ch), col: colOfChar(ch) })
    },
    onSpace: () => {
      if (!settings.sound) return
      buzz(4)
      playSpace()
    },
    onError: () => {
      if (!settings.sound) return
      buzz([8, 20, 8])
      playError()
    },
    onFinish: (result) => {
      const existing = pbsRef.current[result.key]
      const isPb =
        result.key !== "practice" && (!existing || result.wpm > existing.wpm)
      if (settings.sound) {
        if (isPb) playRecord()
        else playFinish()
      }
      setLastResult({ ...result, isPb, prevPb: existing ?? null })
      if (isPb) {
        setPbs((prev) => ({
          ...prev,
          [result.key]: {
            wpm: result.wpm,
            accuracy: result.accuracy,
            timestamp: result.timestamp,
          },
        }))
      }
      setHistory((prev) => addToHistory(prev, result))
      // accumulate per-key accuracy from this test's keystrokes
      setKeyStats((prev) => {
        const next = { ...prev }
        for (const ev of result.events) {
          if (ev.a === "s" || ev.a === "b") continue
          const code = targetsFor(ev.ch || "").codes[0]
          if (!code) continue
          const entry = next[code] || { ok: 0, bad: 0 }
          next[code] = {
            ok: entry.ok + (ev.a === "c" ? 1 : 0),
            bad: entry.bad + (ev.a === "i" ? 1 : 0),
          }
        }
        return next
      })
      setScreen("result")
    },
  })

  const { handleKeyDown, restart: engineRestart, status: engineStatus } = engine

  /* ?showcase autoplay demo mode (README footage + live demo) */
  useShowcase({ engine, setThemeId, setSettings, setSeenIntro, setScreen })

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  /* regenerate when generation settings change — but not on mount
     (the engine already generates its first test). A settings
     signature makes this StrictMode-safe. */
  const genKey = `${settings.mode}|${settings.timeValue}|${settings.wordValue}|${settings.punctuation}|${settings.numbers}|${settings.wordLength}|${settings.wordPool}|${settings.customText}`
  const genKeyRef = useRef(genKey)
  useEffect(() => {
    if (genKeyRef.current === genKey) return
    genKeyRef.current = genKey
    engineRestart()
  }, [genKey, engineRestart])

  const heatMap = useMemo(() => {
    const map = {}
    for (const [code, s] of Object.entries(keyStats)) {
      const total = (s?.ok || 0) + (s?.bad || 0)
      if (total >= 5) {
        const ratio = s.bad / total
        if (ratio > 0.04) map[code] = ratio
      }
    }
    return map
  }, [keyStats])

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      if (
        t &&
        (t.tagName === "TEXTAREA" ||
          t.tagName === "INPUT" ||
          t.isContentEditable)
      ) {
        return
      }
      if (anyDialogOpen()) return
      /* leave Tab/Enter to buttons, sliders and links when one has focus
         (tabindex="-1" containers don't count — they're focus targets only) */
      const ae = document.activeElement
      const focusedInteractive =
        ae &&
        ae !== document.body &&
        (ae.tagName === "BUTTON" ||
          ae.tagName === "A" ||
          ae.getAttribute("role") === "slider" ||
          (ae.hasAttribute("tabindex") && ae.getAttribute("tabindex") !== "-1"))
      if (focusedInteractive) return
      if (e.key === "Enter" && screen === "result") {
        e.preventDefault()
        engineRestart()
        setScreen("test")
        return
      }
      if (e.code === "Tab" || e.key === "Escape") {
        e.preventDefault()
        if (zen && e.key === "Escape") {
          setZen(false)
          return
        }
        if (screen === "stats") {
          setScreen("test")
          return
        }
        if (screen === "test" && e.key === "Escape" && engineStatus === "idle") {
          return
        }
        engineRestart()
        setScreen("test")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [engineRestart, engineStatus, screen, zen])

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
  }, [screen])

  useEffect(() => {
    const onBlurWin = () => setBlurred(true)
    const onFocusWin = () => setBlurred(false)
    window.addEventListener("blur", onBlurWin)
    window.addEventListener("focus", onFocusWin)
    return () => {
      window.removeEventListener("blur", onBlurWin)
      window.removeEventListener("focus", onFocusWin)
    }
  }, [])

  const nextTest = useCallback(() => {
    engineRestart()
    setScreen("test")
  }, [engineRestart])

  const startPractice = useCallback(() => {
    engine.startWith(sampleWeakWords(keyStatsRef.current, 60), {
      key: "practice",
      label: "practice · weak keys",
      durationSec: 30,
      generate: (n) => sampleWeakWords(keyStatsRef.current, n),
    })
    setZen(false)
    setScreen("test")
  }, [engine])

  /* drill the words that cost the most in the last run: cycle them in a
     shuffled order so the same word never repeats back to back */
  const startWordDrill = useCallback(
    (list) => {
      const pool = [...new Set(list)].filter(Boolean)
      if (!pool.length) return
      const make = (n) => {
        const out = []
        let last = null
        while (out.length < n) {
          const round = [...pool].sort(() => Math.random() - 0.5)
          if (round.length > 1 && round[0] === last) round.push(round.shift())
          out.push(...round)
          last = out[out.length - 1]
        }
        return out.slice(0, n)
      }
      engine.startWith(make(60), {
        key: "practice",
        label: "practice · problem words",
        durationSec: 30,
        generate: make,
      })
      setZen(false)
      setScreen("test")
    },
    [engine]
  )

  const importData = useCallback(
    (data) => {
      if (!data || typeof data !== "object") return false
      if (data.settings)
        setSettings((s) => ({ ...s, ...data.settings, mode: s.mode }))
      if (data.theme) setThemeId(data.theme)
      if (Array.isArray(data.history)) setHistory(data.history.slice(0, HISTORY_MAX))
      if (data.pbs && typeof data.pbs === "object") setPbs(data.pbs)
      if (data.keyStats && typeof data.keyStats === "object")
        setKeyStats(data.keyStats)
      return true
    },
    [setSettings, setThemeId, setHistory, setPbs, setKeyStats]
  )

  const resetData = useCallback(() => {
    setPbs({})
    setHistory([])
    setKeyStats({})
  }, [setPbs, setHistory, setKeyStats])

  useEffect(() => {
    if (!isTouch) return
    if (screen !== "test") document.activeElement?.blur?.()
  }, [screen, isTouch])

  const toggleSound = useCallback(
    () => setSettings((s) => ({ ...s, sound: !s.sound })),
    [setSettings]
  )
  const changeVolume = useCallback(
    (v) => setSettings((s) => ({ ...s, volume: v })),
    [setSettings]
  )
  const changePack = useCallback(
    (p) => setSettings((s) => ({ ...s, pack: p })),
    [setSettings]
  )
  const toggleStats = useCallback(
    () => setScreen((sc) => (sc === "stats" ? "test" : "stats")),
    []
  )
  const focusWindow = useCallback(() => window.focus(), [])
  const requestFocus = useCallback(() => {
    if (isTouch && focusInputRef.current) focusInputRef.current()
    else focusWindow()
  }, [isTouch, focusWindow])

  const {
    words: engineWords,
    typed,
    status,
    stats,
    errorTick,
    capsLock,
    series,
    rollingWpm,
  } = engine

  /* living background: ease --typing-energy toward rolling speed so the
     backdrop charges while racing, simmers when keystrokes stall mid-run,
     and decays to calm at idle/finish. The loop sleeps once settled. */
  const energyRef = useRef({ value: 0, typed: null, at: 0 })
  useEffect(() => {
    if (calm || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.style.setProperty("--typing-energy", "0")
      return
    }
    const st8 = energyRef.current
    if (typed !== st8.typed) {
      st8.typed = typed
      st8.at = performance.now()
    }
    let raf = 0
    const tick = () => {
      const stalled = performance.now() - st8.at > 2500
      const target =
        status !== "running"
          ? 0
          : stalled
            ? 0.15
            : Math.min(1, Math.max(0, (rollingWpm ?? 0) / 120))
      const next = st8.value + (target - st8.value) * 0.1
      if (Math.abs(next - target) < 0.004) {
        st8.value = target
        document.documentElement.style.setProperty("--typing-energy", target.toFixed(3))
        return
      }
      st8.value = next
      document.documentElement.style.setProperty("--typing-energy", next.toFixed(3))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [typed, status, rollingWpm, calm])

  const wordIndex = typed.length - 1
  const currentInput = typed[wordIndex] ?? ""
  const currentWord = engineWords[wordIndex] ?? ""
  const nextChar =
    currentInput.length >= currentWord.length ? " " : currentWord[currentInput.length]

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-full flex-col">
        <h1 className="sr-only">keyriff — typing trainer</h1>
        {!calm && <div className="bgfx" aria-hidden>
          {theme.flair !== "matrix" && (
            <>
              <span className="orb orb1" style={theme.flair ? { opacity: 0.55 } : undefined} />
              <span className="orb orb2" style={theme.flair ? { opacity: 0.55 } : undefined} />
            </>
          )}
          {theme.flair !== "matrix" && ambientFor(theme.id) === "motes" && <span className="motes" />}
          {ambientFor(theme.id) === "embers" && <span className="motes embers" />}
          {ambientFor(theme.id) === "snow" && <span className="motes snow" />}
          {ambientFor(theme.id) === "bubbles" && (
            <span className="motes bubbles" />
          )}
          {ambientFor(theme.id) === "scan" && <span className="scan" />}
          {ambientFor(theme.id) === "rain" && (
            <>
              <span className="drop d1" />
              <span className="drop d2" />
              <span className="drop d3" />
              <span className="drop d4" />
              <span className="drop d5" />
              <span className="drop d6" />
            </>
          )}
        </div>}
        {calm ? null : theme.flair === "matrix" ? (
          <div className="flair-matrix" aria-hidden>
            <MatrixRain />
          </div>
        ) : theme.flair && (
          <div className={theme.flair === "aurora" ? "aurora" : `flair-${theme.flair}`} aria-hidden>
            {theme.flair === "aurora" && (
              <>
                <span className="a1" />
                <span className="a2" />
                <span className="a3" />
              </>
            )}
            {theme.flair === "stars" && (
              <>
                <span className="s1" />
                <span className="s2" />
                <span className="s3" />
                {theme.id === "ghost" && <span className="s4" />}
              </>
            )}
            {theme.flair === "mesh" && (
              <>
                <span className="m1" />
                <span className="m2" />
                <span className="m3" />
                <span className="m-ring" />
              </>
            )}
            {theme.flair === "grid" && (
              <>
                <span className="g-floor" />
                <span className="g-horizon" />
                <span className="g-sun" />
                <span className="g-scan" />
              </>
            )}
            {theme.flair === "embers" && (
              <>
                <span className="e1" />
                <span className="e2" />
                <span className="e3" />
                <span className="e4" />
                <span className="e5" />
                <span className="e6" />
                <span className="e7" />
                <span className="e8" />
              </>
            )}
            {theme.flair === "rain" && (
              <>
                <span className="r1" />
                <span className="r2" />
                <span className="r3" />
                <span className="r4" />
                <span className="r5" />
                <span className="r6" />
                <span className="r7" />
                <span className="r8" />
                <span className="r9" />
              </>
            )}
            {theme.flair === "bubbles" && (
              <>
                <span className="b1" />
                <span className="b2" />
                <span className="b3" />
                <span className="b4" />
                <span className="b5" />
                <span className="b6" />
                <span className="b7" />
              </>
            )}
            {theme.flair === "snow" && (
              <>
                <span className="n1" />
                <span className="n2" />
                <span className="n3" />
                <span className="n4" />
                <span className="n5" />
                <span className="n6" />
                <span className="n7" />
                <span className="n8" />
              </>
            )}
            {theme.flair === "petals" && (
              <>
                <span className="p1" />
                <span className="p2" />
                <span className="p3" />
                <span className="p4" />
                <span className="p5" />
                <span className="p6" />
                <span className="p7" />
                <span className="p8" />
              </>
            )}
          </div>
        )}
      <div className="vignette" aria-hidden />
      <div className="grain" aria-hidden />
      <TopBar
        settings={settings}
        themeId={themeId}
        screen={screen}
        onThemeChange={setThemeId}
        onToggleSound={toggleSound}
        onVolume={changeVolume}
        onPackChange={changePack}
        onToggleStats={toggleStats}
      />

      <main
        ref={mainRef}
        tabIndex={-1}
        className={`mx-auto flex w-full flex-1 flex-col justify-center px-4 outline-none sm:px-6 pb-6 transition-all duration-300 ${
          zen ? "max-w-5xl" : "max-w-4xl"
        }`}
      >
        <AnimatePresence mode="popLayout">
          {screen === "test" ? (
            <motion.div
              key="test"
              {...screenMotion("test")}
              className={`flex flex-col ${zen ? "gap-4" : "gap-6 [@media(min-height:900px)]:gap-9"}`}
            >
              {!zen && (
                <AnimatePresence>
                  {!seenIntro && history.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="glass mx-auto flex w-fit max-w-full items-center gap-3 rounded-xl bg-surface px-4 py-2.5 text-sm text-sub"
                    >
                      <span className="truncate">
                        just start typing — <span className="font-semibold text-text">tab</span> restarts
                      </span>
                      <button
                        onClick={() => setSeenIntro(true)}
                        className="shrink-0 rounded-md bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent transition-colors duration-150 hover:bg-accent/25"
                      >
                        got it
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
              {!zen && <ConfigBar settings={settings} onChange={setSettings} />}
              <div>
                {!zen && (
                  <LiveStats
                    status={status}
                    typed={typed}
                    words={engineWords}
                    series={series}
                    stats={stats}
                    settings={settings}
                    subscribeClock={engine.subscribeClock}
                    getClock={engine.getClock}
                    getLimit={engine.getLimit}
                  />
                )}
                <TypingTest
                  words={engineWords}
                  typed={typed}
                  status={status}
                  errorTick={errorTick}
                  capsLock={capsLock}
                  blurred={blurred}
                  zen={zen}
                  fontSize={settings.fontSize}
                  showGhost={settings.ghost === true && !calm}
                  onFocusRequest={requestFocus}
                />
                <ProgressBar
                  subscribeClock={engine.subscribeClock}
                  getClock={engine.getClock}
                  getLimit={engine.getLimit}
                  wordCount={engineWords.length}
                  typedCount={typed.length}
                />
                {zen ? (
                  <div className="mt-4 flex items-center justify-between px-1">
                    <span className="text-xs text-sub/70">
                      esc exit · tab restart
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setZen(false)}
                      title="exit zen mode"
                      aria-label="exit zen mode"
                      className="rounded-lg p-2.5 text-sub transition-colors duration-150 hover:text-text"
                    >
                      <ShrinkIcon />
                    </motion.button>
                  </div>
                ) : (
                  <div className="mt-3 flex justify-end gap-1">
                    <KbStylePicker
                      value={settings.kbStyle ?? "laser"}
                      onChange={(id) => setSettings((s) => ({ ...s, kbStyle: id }))}
                    />
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          fontSize:
                            s.fontSize === "s" ? "m" : s.fontSize === "m" ? "l" : "s",
                        }))
                      }
                      title="cycle test text size"
                      aria-label={`text size ${settings.fontSize}`}
                      className={`rounded-lg p-2.5 transition-colors duration-150 ${
                        settings.fontSize !== "m"
                          ? "text-accent"
                          : "text-sub hover:text-text"
                      }`}
                    >
                      <span
                        className={`block font-bold leading-none ${
                          settings.fontSize === "s"
                            ? "text-xs"
                            : settings.fontSize === "m"
                              ? "text-sm"
                              : "text-base"
                        }`}
                      >
                        Aa
                      </span>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        setSettings((s) => ({ ...s, showHeat: !s.showHeat }))
                      }
                      title="show your weak keys on the keyboard"
                      aria-label="toggle weak-key heat map"
                      aria-pressed={!!settings.showHeat}
                      className={`rounded-lg p-2.5 transition-colors duration-150 ${
                        settings.showHeat
                          ? "text-error"
                          : "text-sub hover:text-text"
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2c1.5 3.5-1 4.8-1 7.2 0 1.6 1.2 2.8 2.8 2.8 1.9 0 3.2-1.6 3.2-3.6C17 5.5 14.5 3.2 12 2z" />
                        <path d="M5.6 10.6C7.4 12.4 8 14.4 8 16a4 4 0 0 0 8 0c0-.8-.2-1.6-.5-2.4" />
                        <path d="M5.6 10.6C4.6 11.8 4 13.3 4 15a8 8 0 0 0 16 0c0-1.7-.6-3.2-1.6-4.4" />
                      </svg>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setZen(true)}
                      title="zen mode — hide everything"
                      aria-label="enter zen mode"
                      className="rounded-lg p-2.5 text-sub transition-colors duration-150 hover:text-text"
                    >
                      <ZenIcon />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.85, rotate: -30 }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={nextTest}
                      title="restart test"
                      aria-label="restart test"
                      className="rounded-lg p-2.5 text-sub transition-colors duration-150 hover:text-text"
                    >
                      <RestartIcon />
                    </motion.button>
                  </div>
                )}
                {!zen && (
                  <Keyboard
                    nextChar={nextChar}
                    capsLock={capsLock}
                    active={status !== "finished"}
                    playing={status === "running"}
                    heatMap={settings.showHeat ? heatMap : null}
                    errorTick={errorTick}
                  />
                )}
              </div>
            </motion.div>
          ) : screen === "stats" ? (
            <motion.div key="stats" {...screenMotion("stats")}>
              <StatsPage
                history={history}
                pbs={pbs}
                keyStats={keyStats}
                settings={settings}
                themeId={themeId}
                onBack={() => setScreen("test")}
                onImport={importData}
                onReset={resetData}
                onPractice={startPractice}
              />
            </motion.div>
          ) : (
            lastResult && (
              <motion.div key="result" {...screenMotion("result")}>
                <ResultScreen result={lastResult} onNext={nextTest} onPracticeWords={startWordDrill} />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </main>

      {!zen && <Footer />}

      {isTouch && screen === "test" && (
        <TouchInput
          dispatchKey={engine.dispatchKey}
          registerFocus={registerFocus}
        />
      )}
      </div>
    </MotionConfig>
  )
}
