import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
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
import { isTouchDevice } from "./lib/touch"
import { useLocalStorage } from "./hooks/useLocalStorage"
import { useTypingEngine } from "./hooks/useTypingEngine"
import { applyTheme, getTheme } from "./lib/themes"
import { rowOfChar, targetsFor } from "./lib/keys"
import { sampleWeakWords } from "./lib/engine"
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
  const [themeId, setThemeId] = useLocalStorage("typer:v2:theme", "serika")
  const [pbs, setPbs] = useLocalStorage("typer:v2:pbs", {})
  const [history, setHistory] = useLocalStorage("typer:v2:history", [])
  const [keyStats, setKeyStats] = useLocalStorage("typer:v2:keystats", {})
  const [screen, setScreen] = useState("test")
  const [lastResult, setLastResult] = useState(null)
  const [blurred, setBlurred] = useState(false)
  const [zen, setZen] = useState(false)

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

  /* zen is a test-screen-only mode */
  useEffect(() => {
    if (screen !== "test") setZen(false)
  }, [screen])

  useEffect(() => {
    applyTheme(themeId)
  }, [themeId])

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
      playKey({ row: rowOfChar(ch) })
    },
    onSpace: () => settings.sound && playSpace(),
    onError: () => settings.sound && playError(),
    onFinish: (result) => {
      const existing = pbsRef.current[result.key]
      const isPb = !existing || result.wpm > existing.wpm
      if (settings.sound) (isPb ? playRecord() : playFinish())
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
      setHistory((prev) =>
        [
          { ...result, events: [], words: [] },
          ...prev,
        ].slice(0, 50)
      )
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

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    engineRestart()
  }, [
    engineRestart,
    settings.mode,
    settings.timeValue,
    settings.wordValue,
    settings.punctuation,
    settings.numbers,
    settings.customText,
  ])

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
      if (document.querySelector("[data-typer-modal]")) return
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

  const importData = useCallback(
    (data) => {
      if (!data || typeof data !== "object") return false
      if (data.settings)
        setSettings((s) => ({ ...s, ...data.settings, mode: s.mode }))
      if (data.theme) setThemeId(data.theme)
      if (Array.isArray(data.history)) setHistory(data.history.slice(0, 200))
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
  } = engine

  const wordIndex = typed.length - 1
  const currentInput = typed[wordIndex] ?? ""
  const currentWord = engineWords[wordIndex] ?? ""
  const nextChar =
    currentInput.length >= currentWord.length ? " " : currentWord[currentInput.length]

  return (
    <div className="flex min-h-full flex-col">
      {theme.flair && (
        <div className="aurora" aria-hidden>
          <span className="a1" />
          <span className="a2" />
          <span className="a3" />
        </div>
      )}
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
        className={`mx-auto flex w-full flex-1 flex-col justify-center px-6 pb-6 transition-all duration-300 ${
          zen ? "max-w-5xl" : "max-w-4xl"
        }`}
      >
        <AnimatePresence mode="wait">
          {screen === "test" ? (
            <motion.div
              key="test"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -16, transition: { duration: 0.18 } }}
              className={`flex flex-col ${zen ? "gap-4" : "gap-9"}`}
            >
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
                  onFocusRequest={requestFocus}
                />
                <ProgressBar
                  subscribeClock={engine.subscribeClock}
                  getClock={engine.getClock}
                  settings={settings}
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
                      className="rounded-lg p-2 text-sub transition-colors duration-150 hover:text-text"
                    >
                      <ShrinkIcon />
                    </motion.button>
                  </div>
                ) : (
                  <div className="mt-3 flex justify-end gap-1">
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        setSettings((s) => ({ ...s, showHeat: !s.showHeat }))
                      }
                      title="show your weak keys on the keyboard"
                      aria-pressed={!!settings.showHeat}
                      className={`rounded-lg p-2 transition-colors duration-150 ${
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
                      className="rounded-lg p-2 text-sub transition-colors duration-150 hover:text-text"
                    >
                      <ZenIcon />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.85, rotate: -30 }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={nextTest}
                      title="restart test"
                      className="rounded-lg p-2 text-sub transition-colors duration-150 hover:text-text"
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
                  />
                )}
              </div>
            </motion.div>
          ) : screen === "stats" ? (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
            >
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
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
              >
                <ResultScreen result={lastResult} onNext={nextTest} />
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
  )
}
