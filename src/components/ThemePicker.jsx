import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { THEMES, previewTheme, endPreview } from "../lib/themes"
import { dialogOpen, dialogClose } from "../lib/dialogs"
import { useLocalStorage } from "../hooks/useLocalStorage"

function PaletteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

function DiceIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function Swatches({ theme }) {
  return (
    <span className="flex shrink-0 items-center -space-x-1">
      {[theme.base, theme.accent, theme.accent2].map((c, i) => (
        <span
          key={i}
          className="h-3.5 w-3.5 rounded-full border border-black/25"
          style={{ backgroundColor: c, zIndex: 3 - i }}
        />
      ))}
    </span>
  )
}

export default function ThemePicker({ themeId, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const currentRef = useRef(themeId)
  const [recentIds, setRecentIds] = useLocalStorage("typer:v2:recent-themes", [])

  function select(id, close = true) {
    currentRef.current = id
    setRecentIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 5))
    onChange(id)
    if (close) setOpen(false)
  }

  function shuffle() {
    const pool = THEMES.filter((t) => t.id !== currentRef.current)
    const pick = pool[Math.floor(Math.random() * pool.length)]
    if (pick) {
      previewTheme(pick.id)
      select(pick.id, false)
    }
  }

  const recentItems = recentIds
    .filter((id) => id !== themeId)
    .map((id) => THEMES.find((t) => t.id === id))
    .filter(Boolean)
    .slice(0, 5)

  useEffect(() => {
    currentRef.current = themeId
  }, [themeId])

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
      endPreview(currentRef.current)
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
        aria-label="choose theme"
        aria-expanded={open}
        aria-haspopup="true"
        title="choose theme"
        className={`rounded-lg p-2.5 transition-colors duration-150 ${
          open ? "text-text" : "text-sub hover:text-text"
        }`}
      >
        <PaletteIcon />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="glass absolute right-0 top-11 z-50 max-h-[70vh] w-56 origin-top-right overflow-y-auto rounded-xl bg-surface p-1.5 shadow-xl"
            data-typer-modal
          >
            {recentItems.length > 0 && (
              <div>
                <div className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-sub/70">
                  Recent
                </div>
                <div className="flex flex-wrap gap-1.5 px-2.5 pb-1">
                  {recentItems.map((t) => (
                    <button
                      key={t.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => previewTheme(t.id)}
                      onMouseLeave={() => endPreview(currentRef.current)}
                      onClick={() => select(t.id)}
                      title={t.name}
                      aria-label={`theme ${t.name}`}
                      className="rounded-lg border border-sub/20 p-1 transition-colors duration-100 hover:border-accent/50"
                    >
                      <Swatches theme={t} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {[
              { tier: "hero", label: "HERO" },
              { tier: "core", label: "CORE" },
              { tier: "light", label: "LIGHT" },
            ].map((group) => {
              const items = THEMES.filter(
                (t) => (t.tier ?? "core") === group.tier
              )
              if (items.length === 0) return null
              return (
                <div key={group.tier}>
                  <div className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-sub/70">
                    {group.label}
                  </div>
                  {items.map((t) => {
                    const active = t.id === themeId
                    return (
                      <motion.button
                        key={t.id}
                        whileHover={{ x: 3 }}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => previewTheme(t.id)}
                        onMouseLeave={() => endPreview(currentRef.current)}
                        onClick={() => select(t.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-100 ${
                          active
                            ? "bg-accent/15 font-semibold text-accent"
                            : "text-text hover:bg-surface-hi"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Swatches theme={t} />
                          <span className="truncate">{t.name}</span>
                          {t.flair && (
                            <span className="rounded bg-accent/15 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-accent">
                              pro
                            </span>
                          )}
                        </span>
                        {active && (
                          <span className="shrink-0 text-accent">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              )
            })}
            <div className="mt-1 flex items-center justify-between border-t border-sub/20 px-2.5 pb-1 pt-2 text-[10px] leading-relaxed text-sub/70">
              <span>themes are saved automatically</span>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={shuffle}
                title="shuffle theme"
                aria-label="shuffle theme"
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sub transition-colors duration-100 hover:bg-surface-hi hover:text-accent"
              >
                <DiceIcon />
                shuffle
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
