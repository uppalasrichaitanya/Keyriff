import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { THEMES } from "../lib/themes"

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

  useEffect(() => {
    if (!open) return
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
        title="choose theme"
        className={`rounded-lg p-2 transition-colors duration-150 ${
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
            {THEMES.map((t) => {
              const active = t.id === themeId
              return (
                <motion.button
                  key={t.id}
                  whileHover={{ x: 3 }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(t.id)
                    setOpen(false)
                  }}
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
            <div className="mt-1 border-t border-sub/20 px-2.5 pb-1 pt-2 text-[10px] leading-relaxed text-sub/70">
              themes are saved automatically
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
