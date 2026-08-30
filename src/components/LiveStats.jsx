import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  memo,
} from "react"
import { AnimatePresence, motion } from "framer-motion"
import { playMilestone, playTick } from "../lib/sound"

function BoltIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  )
}

/* memoized: only redraws when the series gains a second */
const Spark = memo(function Spark({ series }) {
  const W = 150
  const H = 42
  const maxW = Math.max(30, ...series.map((p) => p.wpm)) * 1.15
  const pts = series.map((p, i) => [
    (i / Math.max(1, series.length - 1)) * (W - 6) + 3,
    H - 4 - (p.wpm / maxW) * (H - 10),
  ])
  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ")
  const last = pts[pts.length - 1]
  const area = `${path} L${last[0].toFixed(1)},${H} L3,${H} Z`

  return (
    <motion.svg
      viewBox={`0 0 ${W} ${H}`}
      className="hidden h-11 w-36 min-[480px]:block sm:w-40"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      aria-label="live wpm chart"
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <path
        d={path}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <motion.circle
        cx={last[0]}
        cy={last[1]}
        r="3"
        fill="var(--color-accent)"
        animate={{ opacity: [1, 0.45, 1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
    </motion.svg>
  )
})

function LiveStats({
  status,
  typed,
  words,
  series,
  stats,
  settings,
  subscribeClock,
  getClock,
}) {
  const elapsed = useSyncExternalStore(subscribeClock, getClock)

  const streak = useMemo(() => {
    let s = 0
    for (let wi = typed.length - 1; wi >= 0; wi--) {
      const inp = typed[wi]
      if (inp == null) break
      const target = words[wi] ?? ""
      let bad = false
      for (let ci = inp.length - 1; ci >= 0; ci--) {
        if (inp[ci] === target[ci]) s++
        else {
          bad = true
          break
        }
      }
      if (bad) break
      if (wi > 0) s++
    }
    return s
  }, [typed, words])

  const durMs =
    settings.mode === "time" || settings.mode === "daily"
      ? settings.timeValue * 1000
      : null
  const timeLeft =
    durMs != null
      ? Math.max(0, Math.ceil((durMs - elapsed) / 1000))
      : null
  const wordsLeft =
    settings.mode !== "time" && settings.mode !== "daily"
      ? Math.max(0, words.length - (typed.length - 1))
      : null
  const big =
    status === "idle"
      ? null
      : timeLeft != null
        ? timeLeft
        : wordsLeft

  const minutes = elapsed > 0 ? elapsed / 60000 : 0
  const liveWpm = minutes > 0 ? Math.round(stats.correct / 5 / minutes) : 0
  const totalTyped = stats.correct + stats.incorrect + stats.extra
  const liveAcc =
    totalTyped > 0 ? Math.round((stats.correct / totalTyped) * 100) : 100
  const running = status === "running"

  /* live wpm in the tab title while racing */
  useEffect(() => {
    if (running && liveWpm > 0) document.title = `${liveWpm} wpm · typer`
  }, [running, liveWpm])
  useEffect(() => {
    if (status === "idle") document.title = "typer"
  }, [status])
  useEffect(() => () => { document.title = "typer" }, [])

  /* countdown ticks for the last three seconds of a time test */
  const prevTickRef = useRef(null)
  useEffect(() => {
    if (settings.mode !== "time" || !running) {
      prevTickRef.current = null
      return
    }
    const t = Math.max(0, Math.ceil((durMs - elapsed) / 1000))
    if (prevTickRef.current !== t) {
      if (t >= 1 && t <= 3 && settings.sound) playTick()
      prevTickRef.current = t
    }
  }, [elapsed, running, settings.mode, settings.timeValue, settings.sound])

  /* streak milestone sparkle */
  const prevStreakRef = useRef(0)
  useEffect(() => {
    if (
      running &&
      [25, 50, 100, 200].includes(streak) &&
      streak > prevStreakRef.current &&
      settings.sound
    ) {
      playMilestone()
    }
    prevStreakRef.current = streak
  }, [streak, running, settings.sound])

  return (
    <div className="mb-3 flex h-12 select-none items-end justify-between sm:h-14">
      <AnimatePresence mode="wait">
        {big != null ? (
          <motion.span
            key="live"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="text-4xl font-extrabold tabular-nums text-accent sm:text-5xl"
          >
            {big}
          </motion.span>
        ) : (
          <motion.span
            key="ghost"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-4xl font-extrabold tabular-nums text-sub/40 sm:text-5xl"
          >
            {settings.mode === "time" || settings.mode === "daily"
              ? settings.timeValue
              : settings.mode === "quote" || settings.mode === "custom"
                ? words.length
                : settings.wordValue}
          </motion.span>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-3 pb-1 sm:gap-5">
        <AnimatePresence>
          {running && series.length > 1 && (
            <Spark key="spark" series={series} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {running && streak >= 4 && (
            <motion.div
              key="streak"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold tabular-nums ${
                streak >= 50
                  ? "bg-accent/25 text-accent shadow-[0_0_16px_-2px_color-mix(in_srgb,var(--color-accent)_45%,transparent)]"
                  : "bg-accent/10 text-accent"
              }`}
              title="current correct streak"
            >
              <BoltIcon />
              <motion.span
                key={streak}
                initial={{ scale: 0.75 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 700, damping: 15 }}
                className="inline-block"
              >
                {streak}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {running && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3 text-sm sm:gap-5"
            >
              <span className="text-sub">
                wpm{" "}
                <span className="font-semibold tabular-nums text-text">
                  {liveWpm}
                </span>
              </span>
              <span className="text-sub">
                acc{" "}
                <span className="font-semibold tabular-nums text-text">
                  {liveAcc}%
                </span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default memo(LiveStats)
