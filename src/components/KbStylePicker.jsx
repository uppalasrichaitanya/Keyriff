import { useEffect, useRef, useState, memo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { dialogOpen, dialogClose } from "../lib/dialogs"

export const KB_STYLES = [
  { id: "laser", name: "laser" },
  { id: "solid", name: "solid" },
  { id: "retro", name: "retro" },
  { id: "terminal", name: "terminal" },
  { id: "low", name: "low profile" },
  { id: "gummy", name: "gummy" },
  { id: "neon", name: "neon" },
  { id: "chrome", name: "chrome" },
  { id: "ice", name: "ice" },
  { id: "artisan", name: "artisan" },
]

function BoardIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M8 17h8" />
    </svg>
  )
}

function KbStylePicker({ value, onChange }) {
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
        aria-label="keyboard style"
        aria-expanded={open}
        aria-haspopup="true"
        title="keyboard style"
        className={`rounded-lg p-2.5 transition-colors duration-150 ${
          open || value !== "laser" ? "text-accent" : "text-sub hover:text-text"
        }`}
      >
        <BoardIcon />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="glass absolute bottom-12 right-0 z-50 w-44 origin-bottom-right rounded-xl bg-surface p-1.5 shadow-xl"
            data-typer-modal
          >
            {KB_STYLES.map((s) => {
              const active = s.id === value
              return (
                <motion.button
                  key={s.id}
                  whileHover={{ x: 3 }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(s.id)
                    setOpen(false)
                  }}
                  aria-pressed={active}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-100 ${
                    active
                      ? "bg-accent/15 font-semibold text-accent"
                      : "text-text hover:bg-surface-hi"
                  }`}
                >
                  {s.name}
                  {active && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </motion.button>
              )
            })}
            <div className="mt-1 border-t border-sub/20 px-2.5 pb-1 pt-2 text-[10px] leading-relaxed text-sub/70">
              pairs with any sound pack
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default memo(KbStylePicker)
