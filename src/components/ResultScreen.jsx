import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useCountUp } from "../hooks/useCountUp"
import WpmChart from "./WpmChart"
import TypingReplay from "./TypingReplay"
import { renderShareCard } from "../lib/shareCard"

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 26 },
  },
}

function CrownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 20h20v2H2zM2 6l5 4 5-8 5 8 5-4-2 11H4z" />
    </svg>
  )
}

function BigStat({ value, decimals = 0, suffix = "", label, accent }) {
  const shown = useCountUp(value, { decimals })
  return (
    <div>
      <div
        className={`text-5xl font-extrabold tabular-nums sm:text-6xl ${
          accent ? "grad-text" : "text-text"
        }`}
      >
        {shown}
        <span className="text-3xl">{suffix}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-sub">{label}</div>
    </div>
  )
}

function SmallStat({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-8">
      <span className="text-sm text-sub">{label}</span>
      <span className="font-semibold tabular-nums text-text">{children}</span>
    </div>
  )
}

function CountUpStat({ label, value, decimals = 0, suffix = "" }) {
  const shown = useCountUp(value, { decimals })
  return <SmallStat label={label}>{shown}{suffix}</SmallStat>
}

function Confetti() {
  const [pieces, setPieces] = useState(null)

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    const cs = getComputedStyle(document.documentElement)
    const colors = [
      cs.getPropertyValue("--color-accent").trim() || "#e2b714",
      cs.getPropertyValue("--color-accent-2").trim() || "#e2b714",
      cs.getPropertyValue("--color-text").trim() || "#d6d6d7",
      cs.getPropertyValue("--color-error").trim() || "#ca4754",
    ]
    const ps = Array.from({ length: 44 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 480,
      y: 170 + Math.random() * 280,
      rot: (Math.random() - 0.5) * 780,
      dur: 1 + Math.random() * 0.7,
      delay: Math.random() * 0.15,
      size: 5 + Math.random() * 5,
      color: colors[i % colors.length],
      round: Math.random() > 0.5,
    }))
    setPieces(ps)
    const t = setTimeout(() => setPieces(null), 2200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <AnimatePresence>
        {pieces?.map((p) => (
          <motion.span
            key={p.id}
            className="absolute left-1/2 top-8"
            style={{
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              background: p.color,
              borderRadius: p.round ? "50%" : "2px",
            }}
            initial={{ x: 0, y: -30, opacity: 1, rotate: 0 }}
            animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rot }}
            transition={{ duration: p.dur, delay: p.delay, ease: [0.15, 0.6, 0.4, 1] }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default function ResultScreen({ result, onNext }) {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(null)

  const { correct, incorrect, extra, missed } = result.chars

  async function copyResult() {
    const text = `typer | ${result.modeLabel} | ${result.wpm} wpm · ${result.accuracy}% acc · ${result.consistency}% consistency`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  async function shareResult() {
    if (shared === "...") return
    setShared("...")
    try {
      const { dataUrl, blob } = await renderShareCard(result)
      let ok = false
      try {
        if (window.ClipboardItem && navigator.clipboard?.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ])
          ok = true
        }
      } catch {}
      if (!ok) {
        const a = document.createElement("a")
        a.href = dataUrl
        a.download = `typer-${Math.round(result.wpm)}wpm.png`
        a.click()
      }
      setShared(ok ? "copied!" : "saved!")
      setTimeout(() => setShared(null), 1600)
    } catch {
      setShared("failed")
      setTimeout(() => setShared(null), 1600)
    }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -16 }}
      className="relative mx-auto flex w-full max-w-3xl flex-col gap-8"
    >
      {result.isPb && <Confetti />}
      <motion.div
        variants={item}
        className="flex flex-wrap items-center justify-between gap-2"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-text">results</h2>
          <span className="rounded-md bg-surface px-2.5 py-1 text-xs font-medium text-sub">
            {result.modeLabel}
          </span>
        </div>
        {result.isPb ? (
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.45 }}
            className="animate-pop flex items-center gap-1.5 rounded-md bg-accent/15 px-3 py-1.5 text-sm font-semibold text-accent"
          >
            <CrownIcon />
            new personal best
            {result.prevPb && (
              <span className="flex items-center gap-0.5 border-l border-accent/25 pl-1.5 text-xs tabular-nums">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4l8 10h-16z" />
                </svg>
                {(result.wpm - result.prevPb.wpm).toFixed(1)}
              </span>
            )}
          </motion.span>
        ) : (
          result.prevPb && (
            <span className="text-sm text-sub">
              best{" "}
              <span className="font-semibold text-text">
                {Math.round(result.prevPb.wpm)}
              </span>{" "}
              wpm
            </span>
          )
        )}
      </motion.div>

      <motion.div
        variants={item}
        className="glass relative flex flex-wrap items-start justify-between gap-8 overflow-hidden rounded-2xl bg-surface px-7 py-6"
      >
        {result.isPb && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(340px 180px at 20% 55%, color-mix(in srgb, var(--color-accent) 30%, transparent), transparent 72%)",
            }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.7, 1.15, 1.35] }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.35 }}
          />
        )}
        <div className="relative flex gap-6 sm:gap-10">
          <BigStat value={result.wpm} label="wpm" accent />
          <BigStat value={result.accuracy} decimals={1} suffix="%" label="accuracy" />
        </div>
        <div className="relative flex min-w-56 flex-col gap-1.5">
          <CountUpStat label="raw" value={result.rawWpm} />
          <CountUpStat label="consistency" value={result.consistency} suffix="%" />
          <SmallStat label="time">{result.timeSec}s</SmallStat>
          <SmallStat label="chars">
            <span className="text-text" title="correct">
              {correct}
            </span>
            <span className="text-sub">/</span>
            <span className="text-error" title="incorrect">
              {incorrect}
            </span>
            <span className="text-sub">/</span>
            <span className="text-error-extra" title="extra (backspaced)">
              {extra}
            </span>
            <span className="text-sub">/</span>
            <span className="text-sub" title="missed (untyped)">
              {missed}
            </span>
          </SmallStat>
        </div>
      </motion.div>

      <motion.div variants={item} className="glass rounded-2xl bg-surface p-4 pt-3">
        <TypingReplay result={result} />
      </motion.div>

      <motion.div variants={item} className="glass rounded-2xl bg-surface p-4 pt-3">
        <WpmChart
          history={result.history}
          pbWpm={result.prevPb ? result.prevPb.wpm : null}
        />
      </motion.div>

      <motion.div
        variants={item}
        className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4"
      >
        <span className="hidden items-center gap-1.5 text-xs text-sub sm:flex">
          press
          <kbd className="rounded border-b-2 border-black/30 bg-surface px-1.5 py-0.5 font-mono">
            enter
          </kbd>
          for a new test
        </span>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={copyResult}
          title="copy result to clipboard"
          className={`flex items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors duration-150 sm:justify-start ${
            copied
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-sub/30 text-sub hover:border-text/40 hover:text-text"
          }`}
        >
          {copied ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          {copied ? "copied!" : "copy"}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={shareResult}
          title="save a shareable image of this result"
          className={`flex items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors duration-150 sm:justify-start ${
            shared
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-sub/30 text-sub hover:border-text/40 hover:text-text"
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          {shared ?? "share"}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          className="grad-accent shadow-accent shadow-accent-hover w-full rounded-lg px-6 py-2.5 font-bold text-[color:var(--color-base)] transition-shadow duration-150 sm:w-auto"
        >
          next test
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
