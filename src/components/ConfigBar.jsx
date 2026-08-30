import { useEffect, useRef, useState, memo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { reduceMotion } from "../lib/motion"
import { dialogOpen, dialogClose } from "../lib/dialogs"

const TIME_VALUES = [15, 30, 60, 120]
const WORD_VALUES = [10, 25, 50, 100]
const WORD_LENGTHS = ["any", "short", "long"]

const barVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.022, delayChildren: 0.04 } },
}
const pillVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
}

/* group gives active pills a shared sliding indicator; toggles
   without a group get a static highlight */
function Pill({ active, children, onClick, label, group }) {
  return (
    <motion.button
      variants={pillVariants}
      whileTap={{ scale: 0.92 }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`relative rounded-md px-2 py-1 text-[13px] transition-colors duration-150 sm:text-sm ${
        active ? "text-accent" : "text-sub hover:text-text"
      }`}
    >
      {active &&
        (group ? (
          <motion.span
            layoutId={group}
            transition={{ type: "spring", stiffness: 520, damping: 38 }}
            className="absolute inset-0 rounded-md bg-accent/12 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-accent)_28%,transparent)]"
          />
        ) : (
          <span className="absolute inset-0 rounded-md bg-accent/12 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-accent)_28%,transparent)]" />
        ))}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px self-center bg-sub/40" />
}

function CustomTextModal({ initial, onStart, onClose }) {
  const [draft, setDraft] = useState(initial)
  const ref = useRef(null)

  useEffect(() => {
    ref.current?.focus()
    dialogOpen()
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      dialogClose()
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0
  const valid = words >= 3

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      data-typer-modal
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 10 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="custom text"
        className="glass max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-5 shadow-2xl"
      >
        <h3 className="mb-1 text-base font-semibold text-text">custom text</h3>
        <p className="mb-3 text-xs text-sub">
          paste or write anything — practice it as its own test
        </p>
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={7}
          placeholder="Type or paste your text here…"
          className="w-full resize-none rounded-xl border border-sub/20 bg-base/60 p-3 font-mono text-sm text-text placeholder:text-sub/60 focus:border-accent/40 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs tabular-nums text-sub">
            {words} word{words === 1 ? "" : "s"}
            {!valid && words > 0 && " · needs at least 3"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-sub transition-colors duration-150 hover:text-text"
            >
              cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              disabled={!valid}
              onClick={() => valid && onStart(draft)}
              className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-all duration-150 ${
                valid
                  ? "grad-accent text-[color:var(--color-base)] shadow-accent hover:brightness-110"
                  : "cursor-not-allowed bg-surface-hi text-sub/50"
              }`}
            >
              start test
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ConfigBar({ settings, onChange }) {
  const set = (patch) => onChange({ ...settings, ...patch })
  const [customOpen, setCustomOpen] = useState(false)
  const isCustom = settings.mode === "custom"

  function handleCustomClick() {
    if (!isCustom && settings.customText) {
      // jump straight back into the saved text
      set({ mode: "custom" })
    } else {
      // edit text (also used to start from scratch)
      setCustomOpen(true)
    }
  }

  return (
    <>
      <motion.div
        variants={barVariants}
        {...(reduceMotion() ? { initial: false } : { initial: "hidden", animate: "show" })}
        className="flex flex-wrap items-center justify-center gap-0.5 select-none"
      >
        {settings.mode !== "quote" &&
          settings.mode !== "custom" &&
          settings.mode !== "daily" && (
            <>
              <Pill
                label="punctuation"
                active={settings.punctuation}
                onClick={() => set({ punctuation: !settings.punctuation })}
              >
                @ punctuation
              </Pill>
              <Pill
                label="numbers"
                active={settings.numbers}
                onClick={() => set({ numbers: !settings.numbers })}
              >
                # numbers
              </Pill>

              <Divider />
            </>
          )}

        <Pill
          group="cfg-mode"
          label="time mode"
          active={settings.mode === "time"}
          onClick={() => set({ mode: "time" })}
        >
          clock time
        </Pill>
        <Pill
          group="cfg-mode"
          label="words mode"
          active={settings.mode === "words"}
          onClick={() => set({ mode: "words" })}
        >
          abc words
        </Pill>
        <Pill
          group="cfg-mode"
          label="quotes mode"
          active={settings.mode === "quote"}
          onClick={() => set({ mode: "quote" })}
        >
          ❝ quotes
        </Pill>
        <Pill
          group="cfg-mode"
          label="daily challenge"
          active={settings.mode === "daily"}
          onClick={() => set({ mode: "daily" })}
        >
          ◉ daily
        </Pill>
        <Pill
          group="cfg-mode"
          label="custom text mode"
          active={isCustom}
          onClick={handleCustomClick}
        >
          ✎ custom
        </Pill>

        <Divider />

        {settings.mode !== "quote" && settings.mode !== "custom" && settings.mode !== "daily" && (
          <Pill
            label="word length"
            active={!!settings.wordLength && settings.wordLength !== "any"}
            onClick={() =>
              set({
                wordLength:
                  WORD_LENGTHS[
                    (WORD_LENGTHS.indexOf(settings.wordLength ?? "any") + 1) %
                      WORD_LENGTHS.length
                  ],
              })
            }
          >
            abc {settings.wordLength ?? "any"}
          </Pill>
        )}

        <Pill
          label="sudden death — test ends on the first mistake"
          active={!!settings.suddenDeath}
          onClick={() => set({ suddenDeath: !settings.suddenDeath })}
        >
          ☠ sudden
        </Pill>

        <Pill
          label="fix errors before moving on"
          active={!!settings.forceCorrect}
          onClick={() => set({ forceCorrect: !settings.forceCorrect })}
        >
          ✓ fix first
        </Pill>

        {settings.mode !== "quote" && settings.mode !== "custom" && settings.mode !== "daily" && (
          <>
            <Divider />

            {(settings.mode === "time" ? TIME_VALUES : WORD_VALUES).map((v) => (
              <Pill
                key={v}
                group="cfg-val"
                label={`set ${v}`}
                active={
                  settings.mode === "time"
                    ? settings.timeValue === v
                    : settings.wordValue === v
                }
                onClick={() =>
                  set(
                    settings.mode === "time"
                      ? { timeValue: v }
                      : { wordValue: v }
                  )
                }
              >
                {v}
              </Pill>
            ))}
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {customOpen && (
          <CustomTextModal
            initial={settings.customText || ""}
            onClose={() => setCustomOpen(false)}
            onStart={(text) => {
              setCustomOpen(false)
              set({ mode: "custom", customText: text })
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default memo(ConfigBar)
