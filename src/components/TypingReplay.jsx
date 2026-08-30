import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import Keyboard from "./Keyboard"
import { targetsFor } from "../lib/keys"
import { reduceMotion } from "../lib/motion"

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  )
}

function ReplayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

function KeyboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2.5" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" />
    </svg>
  )
}

const SPEEDS = [1, 2, 4]
const FLASH_MS = 150

function buildSchedule(events) {
  const out = []
  for (const ev of events) {
    if (ev.a === "s") {
      out.push({ t: ev.t, codes: ["Space"] })
    } else if (ev.a === "b") {
      out.push({ t: ev.t, codes: ["Backspace"] })
    } else if (ev.ch) {
      const { codes, shift } = targetsFor(ev.ch)
      const cs = codes.length ? [...codes] : []
      if (shift) cs.push("ShiftLeft")
      if (cs.length) out.push({ t: ev.t, codes: cs })
    }
  }
  return out
}

export default function TypingReplay({ result }) {
  const { events = [] } = result
  const schedule = useMemo(() => buildSchedule(events), [events])
  const duration =
    schedule.length > 0 ? schedule[schedule.length - 1].t + 500 : 0

  const [playing, setPlaying] = useState(() => !reduceMotion())
  const [speedIdx, setSpeedIdx] = useState(0)
  const [pos, setPos] = useState(0)
  const [pressed, setPressed] = useState(() => new Set())
  const posRef = useRef(0)
  const idxRef = useRef(0)
  const timersRef = useRef(new Set())
  const barRef = useRef(null)
  const speed = SPEEDS[speedIdx]

  function flashKeys(codes) {
    setPressed((prev) => {
      const n = new Set(prev)
      for (const c of codes) n.add(c)
      return n
    })
    const id = setTimeout(() => {
      setPressed((prev) => {
        const n = new Set(prev)
        for (const c of codes) n.delete(c)
        return n
      })
      timersRef.current.delete(id)
    }, FLASH_MS)
    timersRef.current.add(id)
  }

  const clearFlashes = () => {
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current.clear()
  }

  useEffect(
    () => () => {
      timersRef.current.forEach((t) => clearTimeout(t))
      timersRef.current.clear()
    },
    []
  )

  useEffect(() => {
    if (!playing || duration <= 0) return
    let id
    let last = performance.now()
    const tick = (ts) => {
      const dt = ts - last
      last = ts
      posRef.current += dt * speed
      while (
        idxRef.current < schedule.length &&
        schedule[idxRef.current].t <= posRef.current
      ) {
        flashKeys(schedule[idxRef.current].codes)
        idxRef.current++
      }
      if (posRef.current >= duration) {
        posRef.current = duration
        setPos(duration)
        setPlaying(false)
        return
      }
      setPos(posRef.current)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, duration, schedule])

  if (duration <= 0) {
    return (
      <div className="py-6 text-center text-sm text-sub">
        no keystrokes recorded for this test
      </div>
    )
  }

  const seekTo = (v) => {
    clearFlashes()
    posRef.current = v
    let i = 0
    while (i < schedule.length && schedule[i].t <= v) i++
    idxRef.current = i
    setPressed(new Set())
    setPos(v)
  }

  const onBarClick = (e) => {
    const rect = barRef.current.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    seekTo(ratio * duration)
  }

  const onBarKeyDown = (e) => {
    const step = Math.max(250, duration * 0.05)
    let v
    if (e.key === "ArrowRight" || e.key === "ArrowUp") v = pos + step
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") v = pos - step
    else if (e.key === "Home") v = 0
    else if (e.key === "End") v = duration
    else return
    e.preventDefault()
    seekTo(Math.min(duration, Math.max(0, v)))
  }

  const finished = pos >= duration

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-sub">
          <KeyboardIcon />
          keyboard replay
        </span>
        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (finished) seekTo(0)
              setPlaying((p) => !p)
            }}
            aria-label={playing ? "pause replay" : "play replay"}
            title={playing ? "pause" : "play"}
            className={`rounded-md p-1.5 transition-colors duration-150 hover:bg-surface-hi ${
              playing ? "text-accent" : "text-text"
            }`}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88, rotate: -25 }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              seekTo(0)
              setPlaying(true)
            }}
            aria-label="restart replay"
            title="restart"
            className="rounded-md p-1.5 text-sub transition-colors duration-150 hover:bg-surface-hi hover:text-text"
          >
            <ReplayIcon />
          </motion.button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
            aria-label="cycle replay speed"
            title="replay speed"
            className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors duration-150 hover:bg-surface-hi ${
              speed > 1 ? "text-accent" : "text-sub hover:text-text"
            }`}
          >
            {speed}x
          </button>
        </div>
      </div>

      <div className="pointer-events-none overflow-hidden rounded-xl border border-accent/10 bg-base/50 px-1 pb-1 pt-2">
        <Keyboard
          externalPressed={pressed}
          nextChar=""
          capsLock={false}
          active={false}
          compact
        />
      </div>

      <div className="mt-1 flex items-center gap-3">
        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-sub">
          {(pos / 1000).toFixed(1)}s
        </span>
        <div
          ref={barRef}
          onClick={onBarClick}
          onKeyDown={onBarKeyDown}
          role="slider"
          tabIndex={0}
          aria-label="replay position"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(pos)}
          aria-valuetext={`${(pos / 1000).toFixed(1)} seconds`}
          className="group relative h-4 flex-1 cursor-pointer select-none"
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface-hi" />
          <div
            className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent transition-colors duration-150 group-hover:bg-accent/80"
            style={{ width: `${duration ? (pos / duration) * 100 : 0}%` }}
          />
          <div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_8px_color-mix(in_srgb,var(--color-accent)_55%,transparent)] transition-transform duration-100 group-hover:scale-125"
            style={{
              left: `calc(${duration ? (pos / duration) * 100 : 0}% - 5px)`,
            }}
          />
        </div>
        <span className="w-12 shrink-0 text-xs tabular-nums text-sub">
          {(duration / 1000).toFixed(1)}s
        </span>
      </div>
    </div>
  )
}
