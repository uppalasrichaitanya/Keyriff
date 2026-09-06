import { useEffect, useRef, useState, memo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import ThemePicker from "./ThemePicker"
import { SOUND_PACKS, playKey, DEFAULT_PACK } from "../lib/sound"
import { dialogOpen, dialogClose } from "../lib/dialogs"

function ChartIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 4 3 5-7" />
    </svg>
  )
}

function VolumeOnIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function VolumeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  )
}

function VolumeControl({ sound, volume, pack, onToggleSound, onVolume, onPackChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    dialogOpen()
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      dialogClose()
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <motion.button
        whileTap={{ scale: 0.88 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        aria-label="sound settings"
        aria-expanded={open}
        aria-haspopup="true"
        title={`sound ${sound ? "on" : "muted"} · ${volume}%`}
        className={`rounded-lg p-2.5 transition-colors duration-150 ${
          sound && volume > 0
            ? "text-accent"
            : "text-sub hover:text-text"
        }`}
      >
        {sound ? <VolumeOnIcon /> : <VolumeOffIcon />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="glass absolute right-0 top-11 z-50 w-48 origin-top-right rounded-xl bg-surface p-3.5 shadow-xl"
            data-typer-modal
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-sub">
                sound
              </span>
              <button
                role="switch"
                aria-checked={sound}
                aria-label="toggle sound"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onToggleSound}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
                  sound
                    ? "bg-accent"
                    : "bg-surface-hi ring-1 ring-inset ring-sub/30"
                }`}
              >
                <motion.span
                  animate={{ x: sound ? 22 : 3 }}
                  transition={{ type: "spring", stiffness: 600, damping: 28 }}
                  style={{ y: "-50%" }}
                  className="absolute top-1/2 left-0 h-4 w-4 rounded-full bg-[color:var(--color-base)] shadow-md"
                />
              </button>
            </div>
            <div className={sound ? "" : "pointer-events-none opacity-40"}>
              <div className="mb-1.5 flex items-center justify-between text-[11px] tabular-nums text-sub">
                <span>volume</span>
                <span>{volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                disabled={!sound}
                onChange={(e) => onVolume(Number(e.target.value))}
                aria-label="volume level"
                className="w-full cursor-pointer accent-accent"
              />
              <div className="mb-1.5 mt-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-sub">
                <span>pack</span>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const pool = SOUND_PACKS.filter((p) => p.id !== pack)
                    const pick = pool[Math.floor(Math.random() * pool.length)]
                    if (pick) {
                      onPackChange(pick.id)
                      setTimeout(() => playKey({ row: 2, col: 0 }), 30)
                    }
                  }}
                  title="shuffle sound pack"
                  aria-label="shuffle sound pack"
                  className="flex items-center gap-1 rounded px-1 py-0.5 normal-case tracking-normal text-sub transition-colors duration-100 hover:text-accent"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
                    <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
                  </svg>
                  shuffle
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {SOUND_PACKS.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onPackChange(p.id)
                      setTimeout(() => playKey({ row: 2, col: 0 }), 30)
                    }}
                    aria-pressed={pack === p.id}
                    className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-100 ${
                      pack === p.id
                        ? "bg-accent/15 font-semibold text-accent"
                        : "text-text hover:bg-surface-hi"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TopBar({
  settings,
  themeId,
  screen,
  onToggleSound,
  onVolume,
  onPackChange,
  onThemeChange,
  onToggleStats,
}) {
  return (
    <header className="safe-top flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 md:px-10">
      <div className="flex items-center gap-3 select-none">
        <motion.div
          whileHover={{ rotate: -8, scale: 1.08 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          title={`theme: ${themeId}`}
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 64 64"
            className="h-[34px] w-[34px]"
            role="img"
            aria-label="keyriff logo"
          >
            <g
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M28 10 V54" />
              <path d="M28 34 L42 20" />
              <path d="M47 15 L55 8" />
              <path d="M34 30 L54 52" />
            </g>
          </svg>
        </motion.div>
        <span className="grad-text text-2xl font-bold tracking-tight">
          keyriff
        </span>
      </div>

      <div className="flex items-center gap-1">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggleStats}
          aria-label={screen === "stats" ? "back to test" : "open stats"}
          title={screen === "stats" ? "back to test" : "your stats"}
        className={`rounded-lg p-2.5 transition-colors duration-150 ${
          screen === "stats" ? "text-accent" : "text-sub hover:text-text"
        }`}
        >
          <ChartIcon />
        </motion.button>
        <ThemePicker themeId={themeId} onChange={onThemeChange} />
        <VolumeControl
          sound={settings.sound}
          volume={settings.volume ?? 70}
          pack={settings.pack ?? DEFAULT_PACK}
          onToggleSound={onToggleSound}
          onVolume={onVolume}
          onPackChange={onPackChange}
        />
      </div>
    </header>
  )
}

export default memo(TopBar)
