import { useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import ProgressChart from "./ProgressChart"
import { codeLabel } from "../lib/keys"

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function relTime(ts) {
  const d = Date.now() - ts
  const m = 6e4
  const h = 36e5
  const day = 864e5
  if (d < m) return "just now"
  if (d < h) return `${Math.floor(d / m)}m ago`
  if (d < day) return `${Math.floor(d / h)}h ago`
  return `${Math.floor(d / day)}d ago`
}

function fmtTime(sec) {
  if (sec < 60) return `${Math.round(sec)}s`
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  if (m < 60) return `${m}m ${s}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function dayKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function charsOf(r) {
  return r.chars
    ? r.chars.correct + r.chars.incorrect + r.chars.extra
    : 0
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 26 },
  },
}

function Card({ label, value, sub }) {
  return (
    <motion.div
      variants={item}
      className="glass flex flex-col rounded-2xl bg-surface px-4 py-4"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-sub">
        {label}
      </span>
      <span className="mt-1 truncate text-xl font-bold tabular-nums text-text sm:text-2xl">
        {value}
      </span>
      {sub && <span className="mt-0.5 truncate text-xs text-sub">{sub}</span>}
    </motion.div>
  )
}

export default function StatsPage({
  history,
  pbs,
  keyStats,
  settings,
  themeId,
  onBack,
  onImport,
  onReset,
  onPractice,
}) {
  const fileRef = useRef(null)
  const [notice, setNotice] = useState(null)

  const stats = useMemo(() => {
    if (!history.length) return null
    const totalTime = history.reduce((a, r) => a + (r.timeSec || 0), 0)
    const totalChars = history.reduce((a, r) => a + charsOf(r), 0)
    const best = history.reduce((a, r) => (!a || r.wpm > a.wpm ? r : a), null)
    const avgAcc =
      Math.round(
        (history.reduce((a, r) => a + r.accuracy, 0) / history.length) * 10
      ) / 10
    return {
      totalTests: history.length,
      totalTime,
      totalChars,
      best,
      avgAcc,
    }
  }, [history])

  const today = useMemo(() => {
    const k = dayKey(Date.now())
    const list = history.filter((r) => dayKey(r.timestamp) === k)
    if (!list.length) return null
    return {
      tests: list.length,
      chars: list.reduce((a, r) => a + charsOf(r), 0),
      avgWpm: Math.round(list.reduce((a, r) => a + r.wpm, 0) / list.length),
    }
  }, [history])

  const streak = useMemo(() => {
    const days = new Set(history.map((r) => dayKey(r.timestamp)))
    const d = new Date()
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1)
    let s = 0
    while (days.has(dayKey(d))) {
      s++
      d.setDate(d.getDate() - 1)
    }
    return s
  }, [history])

  const weakKeys = useMemo(() => {
    return Object.entries(keyStats)
      .map(([code, s]) => ({
        code,
        label: codeLabel(code),
        total: (s?.ok || 0) + (s?.bad || 0),
        acc: s ? Math.round(((s.ok || 0) / ((s.ok || 0) + (s.bad || 0))) * 100) : 100,
      }))
      .filter((k) => k.total >= 5)
      .sort((a, b) => a.acc - b.acc)
      .slice(0, 5)
  }, [keyStats])

  const ordered = useMemo(() => [...history].reverse(), [history])
  const pbList = useMemo(
    () =>
      Object.entries(pbs)
        .map(([key, v]) => ({ key, ...v }))
        .sort((a, b) => b.timestamp - a.timestamp),
    [pbs]
  )
  const recent = history.slice(0, 10)

  function doExport() {
    const data = {
      app: "typer",
      version: 2,
      exportedAt: Date.now(),
      settings,
      theme: themeId,
      pbs,
      history,
      keyStats,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `typer-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function doImportFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    f.text().then((txt) => {
      try {
        const data = JSON.parse(txt)
        if (data?.app !== "typer") throw new Error("not a typer backup")
        onImport(data)
        setNotice("backup imported")
        setTimeout(() => setNotice(null), 2500)
      } catch {
        setNotice("couldn't read that file")
        setTimeout(() => setNotice(null), 2500)
      }
    })
  }

  function doReset() {
    if (confirm("reset all stats, personal bests and key history?")) onReset()
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -16 }}
      className="mx-auto flex w-full max-w-3xl flex-col gap-6"
    >
      <motion.div variants={item} className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onBack}
          aria-label="back to test"
          title="back (esc)"
          className="rounded-lg p-2.5 text-sub transition-colors duration-150 hover:bg-surface hover:text-text"
        >
          <BackIcon />
        </motion.button>
        <h2 className="text-xl font-semibold text-text">stats</h2>
      </motion.div>

      {!stats ? (
        <motion.div
          variants={item}
          className="glass grid place-items-center rounded-2xl bg-surface py-14 text-sm text-sub"
        >
          <img src="/logo.svg" alt="" className="mb-3 h-12 w-12 opacity-90" />
          no tests yet — finish one to start your history
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card
              label="tests"
              value={stats.totalTests}
              sub={`${stats.totalChars.toLocaleString()} chars typed`}
            />
            <Card label="time typed" value={fmtTime(stats.totalTime)} />
            <Card
              label="best wpm"
              value={Math.round(stats.best.wpm)}
              sub={stats.best.modeLabel}
            />
            <Card label="avg accuracy" value={`${stats.avgAcc}%`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card
              label="today"
              value={today ? today.chars.toLocaleString() : "—"}
              sub={
                today
                  ? `${today.tests} test${today.tests > 1 ? "s" : ""} · ${today.avgWpm} avg wpm`
                  : "nothing typed yet"
              }
            />
            <Card
              label="day streak"
              value={streak > 0 ? `${streak}d` : "—"}
              sub={streak > 0 ? "consecutive practice days" : "type today to start one"}
            />
          </div>

          <motion.div
            variants={item}
            className="glass rounded-2xl bg-surface p-4 pt-3"
          >
            <div className="mb-1 px-1 text-sm font-medium text-sub">
              wpm progression
            </div>
            <ProgressChart data={ordered} />
          </motion.div>

          {weakKeys.length > 0 && (
            <motion.div variants={item} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-sub">
                  keys to practice
                </span>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onPractice}
                  title="start a 30s drill built from your weakest keys"
                  className="rounded-md bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent transition-colors duration-150 hover:bg-accent/25"
                >
                  practice these keys
                </motion.button>
              </div>
              <div className="glass flex flex-wrap gap-2.5 rounded-2xl bg-surface p-4">
                {weakKeys.map((k) => (
                  <div
                    key={k.code}
                    className="flex min-w-28 flex-col gap-1 rounded-xl border border-error/25 bg-error/5 px-3 py-2"
                    title={`${k.total} keystrokes tracked`}
                  >
                    <span className="font-mono text-lg font-bold text-text">
                      {k.label}
                    </span>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-hi">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${k.acc}%`,
                          background:
                            k.acc < 85
                              ? "var(--color-error)"
                              : "color-mix(in srgb, var(--color-error) 55%, var(--color-accent))",
                        }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-sub">
                      {k.acc}% accuracy
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {pbList.length > 0 && (
            <motion.div variants={item} className="flex flex-col gap-2">
              <span className="px-1 text-xs font-semibold uppercase tracking-wider text-sub">
                personal bests
              </span>
              <div className="flex flex-wrap gap-2">
                {pbList.map((pb) => (
                  <div
                    key={pb.key}
                    className="glass flex items-baseline gap-2 rounded-lg bg-surface px-3 py-2"
                  >
                    <span className="text-base font-bold tabular-nums text-accent">
                      {Math.round(pb.wpm)}
                    </span>
                    <span className="text-[11px] text-sub">
                      {pb.key.replace(/-/g, " ")} · {Math.round(pb.accuracy)}%
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {recent.length > 0 && (
            <motion.div
              variants={item}
              className="glass overflow-hidden rounded-2xl bg-surface"
            >
              <div className="px-4 pt-3 text-xs font-semibold uppercase tracking-wider text-sub">
                recent tests
              </div>
              <div className="mt-1 divide-y divide-surface-hi/60">
                {recent.map((r, i) => (
                  <div
                    key={`${r.timestamp}-${i}`}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-text">
                        {r.modeLabel}
                      </div>
                      <div className="text-xs text-sub">{relTime(r.timestamp)}</div>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-4 tabular-nums">
                      <span className="font-bold text-accent">
                        {Math.round(r.wpm)}
                        <span className="ml-0.5 text-[10px] font-normal text-sub">
                          wpm
                        </span>
                      </span>
                      <span className="w-14 text-right text-sub">
                        {r.accuracy}%
                      </span>
                      <span className="w-12 text-right text-sub">
                        {Math.round(r.consistency)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            variants={item}
            className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-4"
          >
            <div>
              <div className="text-sm font-medium text-text">your data</div>
              <div className="text-xs text-sub">
                {notice ?? "everything stays in this browser — export a backup anytime"}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={doExport}
                className="rounded-lg border border-sub/30 px-3 py-1.5 text-sm text-sub transition-colors duration-150 hover:border-text/40 hover:text-text"
              >
                export
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-sub/30 px-3 py-1.5 text-sm text-sub transition-colors duration-150 hover:border-text/40 hover:text-text"
              >
                import
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={doImportFile}
              />
              <button
                onClick={doReset}
                className="rounded-lg border border-error/30 px-3 py-1.5 text-sm text-error transition-colors duration-150 hover:bg-error/10"
              >
                reset
              </button>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
