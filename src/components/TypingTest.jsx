import { useEffect, useLayoutEffect, useMemo, useRef, useState, memo } from "react"
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion"
import Caret from "./Caret"
import { pbKey } from "../lib/engine"

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

const SIZE_CLASSES = {
  s: {
    zen: "text-[1.5rem] leading-[3rem] sm:text-[1.7rem] sm:leading-[3.4rem]",
    test: "text-[1.1rem] leading-[2.2rem] sm:text-[1.3rem] sm:leading-[2.6rem]",
  },
  m: {
    zen: "text-[1.7rem] leading-[3.4rem] sm:text-[2rem] sm:leading-[4rem] md:text-[2.25rem]",
    test: "text-[1.3rem] leading-[2.6rem] sm:text-[1.55rem] sm:leading-[3rem] md:text-[1.7rem]",
  },
  l: {
    zen: "text-[2.1rem] leading-[4.2rem] sm:text-[2.4rem] sm:leading-[4.8rem]",
    test: "text-[1.6rem] leading-[3.2rem] sm:text-[1.9rem] sm:leading-[3.8rem]",
  },
}

/* one word row — memoized so a keystroke only re-renders the
   words whose typed content actually changed */
const Word = memo(function Word({ w, input, isDone }) {
  return (
    <span
      className={`relative whitespace-nowrap ${
        input === undefined ? "text-sub" : ""
      }${isDone ? " opacity-85" : ""}`}
    >
      {w.split("").map((ch, ci) => {
        const t = input?.[ci]
        const cls =
          t === undefined
            ? "text-sub"
            : t === ch
              ? "text-text"
              : "text-error underline decoration-error underline-offset-4"
        return (
          <span key={ci} data-ci={ci} className="inline-block align-top">
            <span className={cls}>{ch}</span>
          </span>
        )
      })}
      {input != null &&
        input.length > w.length &&
        input.slice(w.length).split("").map((ch, i) => (
          <span
            key={`x${i}`}
            data-ci={w.length + i}
            className="inline-block align-top text-error-extra"
          >
            {ch}
          </span>
        ))}
    </span>
  )
})

/* PB ghost caret lookup — fully self-contained so the parent never needs
   new data plumbing.
   Contract: optional `ghostWpm` number prop overrides everything (<= 0 or
   absent = look up `typer:v2:pbs[pbKey(settings, words.length)]`; still
   0/absent = ghost hidden). Returns 0 when there is no PB for this mode. */
function lookupPbWpm(wordCount) {
  try {
    const settings = JSON.parse(localStorage.getItem("typer:v2:settings") ?? "{}")
    const pbs = JSON.parse(localStorage.getItem("typer:v2:pbs") ?? "{}")
    const key = pbKey(
      {
        mode: "time",
        timeValue: 30,
        wordValue: 25,
        punctuation: false,
        numbers: false,
        wordLength: "any",
        ...settings,
      },
      wordCount
    )
    const wpm = pbs?.[key]?.wpm
    return typeof wpm === "number" && wpm > 0 ? wpm : 0
  } catch {
    return 0
  }
}

function TypingTest({
  words,
  typed,
  status,
  errorTick,
  capsLock,
  blurred,
  onFocusRequest,
  zen = false,
  fontSize = "m",
  ghostWpm = null,
  showGhost = false,
}) {
  const wordsBoxRef = useRef(null)
  const typingTimeoutRef = useRef(0)
  const caretInnerRef = useRef(null)
  const startedRef = useRef(false)
  const caretX = useMotionValue(0)
  const caretY = useMotionValue(0)
  const springX = useSpring(caretX, { stiffness: 950, damping: 34, mass: 0.28 })
  const [scrollY, setScrollY] = useState(0)
  const [typing, setTyping] = useState(false)
  /* line height only changes with size/zen — avoid a per-keystroke
     forced layout read */
  const lineHRef = useRef(0)
  const lineHKeyRef = useRef("")

  /* PB ghost caret: replays the mode PB rhythm (one char per
     60 / pbWpm / 5 s) behind the live caret. PB is re-resolved per test
     (words identity) so a freshly-set record shows up on the next run.
     Single 100ms interval while running; hidden under reduced motion. */
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true
  )
  const pbWpm = useMemo(
    () =>
      typeof ghostWpm === "number" && ghostWpm > 0
        ? ghostWpm
        : lookupPbWpm(words.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [words, ghostWpm]
  )
  const [ghostPos, setGhostPos] = useState(null)
  const ghostStartRef = useRef(0)

  useEffect(() => {
    if (status !== "running") {
      ghostStartRef.current = 0
      setGhostPos(null)
    }
  }, [status, words])

  useEffect(() => {
    if (!showGhost || status !== "running" || !pbWpm || pbWpm <= 0 || reducedMotion)
      return
    if (!ghostStartRef.current) ghostStartRef.current = performance.now()
    const t0 = ghostStartRef.current
    const charsPerSec = (pbWpm * 5) / 60
    const lens = words.map((w) => w.length + 1)
    const total = lens.reduce((a, b) => a + b, 0)
    const id = setInterval(() => {
      const chars = Math.floor(((performance.now() - t0) / 1000) * charsPerSec)
      if (chars >= total) {
        setGhostPos(null)
        return
      }
      let acc = 0
      let wi = 0
      while (wi < lens.length - 1 && acc + lens[wi] <= chars) {
        acc += lens[wi]
        wi++
      }
      const ci = chars - acc
      const box = wordsBoxRef.current
      const el = box?.childNodes[wi]
      if (!(el instanceof Element)) return
      const charEl = el.querySelector(`[data-ci="${ci}"]`)
      let x
      if (charEl) {
        x = el.offsetLeft + charEl.offsetLeft
      } else {
        const lastChar =
          el.querySelector(`[data-ci="${ci - 1}"]`) ?? el.lastElementChild
        x = lastChar
          ? el.offsetLeft + lastChar.offsetLeft + lastChar.offsetWidth + 2
          : el.offsetLeft
      }
      const firstChar = el.querySelector('[data-ci="0"]')
      const y = el.offsetTop + (firstChar?.offsetTop ?? charEl?.offsetTop ?? 0)
      setGhostPos((prev) => (prev?.x === x && prev?.y === y ? prev : { x, y }))
    }, 100)
    return () => clearInterval(id)
  }, [showGhost, status, pbWpm, words, reducedMotion])

  const wordIndex = typed.length - 1
  const currentInput = typed[wordIndex] ?? ""

  /* word rows are direct children of the box, in order — no per-word
     refs needed to locate them */
  function wordElAt(i) {
    const box = wordsBoxRef.current
    const el = box?.childNodes[i]
    return el instanceof Element ? el : null
  }

  useLayoutEffect(() => {
    const box = wordsBoxRef.current
    const wordEl = wordElAt(wordIndex)
    if (!box || !wordEl) return

    const pos = currentInput.length
    const charEl = wordEl.querySelector(`[data-ci="${pos}"]`)
    let x
    if (charEl) {
      x = wordEl.offsetLeft + charEl.offsetLeft
    } else {
      const lastChar =
        wordEl.querySelector(`[data-ci="${pos - 1}"]`) ??
        wordEl.lastElementChild
      x = lastChar
        ? wordEl.offsetLeft + lastChar.offsetLeft + lastChar.offsetWidth + 2
        : wordEl.offsetLeft
    }
    const firstChar = wordEl.querySelector('[data-ci="0"]')
    const y =
      wordEl.offsetTop +
      (firstChar?.offsetTop ?? charEl?.offsetTop ?? 0)

    if (!startedRef.current) {
      startedRef.current = true
      caretX.jump(x)
      caretY.jump(y)
    } else {
      caretX.set(x)
      caretY.jump(y)
    }

    const sizeKey = `${fontSize}-${zen}`
    if (lineHKeyRef.current !== sizeKey || !lineHRef.current) {
      lineHRef.current = parseFloat(getComputedStyle(wordEl).lineHeight) || 48
      lineHKeyRef.current = sizeKey
    }
    const lineH = lineHRef.current
    const activeLine = Math.round((wordEl.offsetTop + 1) / lineH)
    setScrollY(-Math.max(0, activeLine - 1) * lineH)
    shakeIndexRef.current = wordIndex
  }, [typed, wordIndex, words, currentInput.length, caretX, caretY, fontSize, zen])

  useEffect(() => {
    if (errorTick === 0) return
    wordElAt(shakeIndexRef.current)?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(3px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 130 }
    )
  }, [errorTick])

  const prevWordIndexRef = useRef(0)
  /* latest word index for the error shake (intentionally keyed only on errorTick) */
  const shakeIndexRef = useRef(0)
  useEffect(() => {
    const wi = typed.length - 1
    if (wi > prevWordIndexRef.current && status === "running") {
      const el = wordElAt(wi - 1)
      if (el) {
        el.style.transformOrigin = "left center"
        el.animate(
          [
            { transform: "scale(1)", opacity: 1 },
            { transform: "scale(0.93)", opacity: 0.85 },
            { transform: "scale(1)", opacity: 1 },
          ],
          { duration: 170, easing: "ease-out" }
        )
      }
    }
    prevWordIndexRef.current = wi
  }, [typed, status])

  useEffect(() => {
    if (status !== "running") {
      setTyping(false)
      return
    }
    setTyping(true)
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 800)
    caretInnerRef.current?.animate(
      [
        { transform: "scaleX(1)", filter: "brightness(1)" },
        { transform: "scaleX(1.8)", filter: "brightness(1.6)" },
        { transform: "scaleX(1)", filter: "brightness(1)" },
      ],
      { duration: 140, easing: "ease-out" }
    )
    return () => clearTimeout(typingTimeoutRef.current)
  }, [typed, status])

  useEffect(() => () => clearTimeout(typingTimeoutRef.current), [])

  return (
    <div className="select-none">
      <AnimatePresence>
        {capsLock && status !== "finished" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="mx-auto mb-3 flex w-fit items-center gap-1.5 rounded-md bg-error/15 px-3 py-1 text-sm font-medium text-error"
          >
            <LockIcon />
            caps lock
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`relative cursor-pointer overflow-hidden ${
          zen ? "h-44 sm:h-52" : "h-32 sm:h-36"
        }`}
        onClick={onFocusRequest}
      >
        <motion.div
          ref={wordsBoxRef}
          animate={{ y: scrollY }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
          className={`relative flex flex-wrap content-start gap-x-[1.15ch] will-change-transform ${
            (SIZE_CLASSES[fontSize] ?? SIZE_CLASSES.m)[zen ? "zen" : "test"]
          }`}
        >
          {words.map((w, wi) => (
            <Word key={wi} w={w} input={typed[wi]} isDone={wi < typed.length - 1} />
          ))}

          <Caret
            x={springX}
            y={caretY}
            visible={!blurred && status !== "finished"}
            typing={typing}
            innerRef={caretInnerRef}
          />
          {showGhost && ghostPos && status === "running" && !blurred && !reducedMotion && (
            <div
              className="caret-ghost"
              style={{
                transform: `translate(${ghostPos.x}px, ${ghostPos.y}px)`,
              }}
              aria-hidden
            >
              <span className="caret-ghost-tag">PB {Math.round(pbWpm)}</span>
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {blurred && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-30 grid cursor-pointer place-items-center backdrop-blur-[7px]"
              onClick={onFocusRequest}
            >
              <span className="flex items-center gap-2 text-lg text-sub">
                click here to focus
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default memo(TypingTest)
