import { useEffect, useLayoutEffect, useRef, useState, memo } from "react"
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion"
import Caret from "./Caret"

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
const Word = memo(function Word({ w, input }) {
  return (
    <span
      className={`relative whitespace-nowrap ${
        input === undefined ? "text-sub" : ""
      }`}
    >
      {w.split("").map((ch, ci) => {
        const t = input?.[ci]
        const cls =
          t === undefined
            ? "text-sub"
            : t === ch
              ? "text-text"
              : "text-error"
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

    const lineH = parseFloat(getComputedStyle(wordEl).lineHeight) || 48
    const activeLine = Math.round((wordEl.offsetTop + 1) / lineH)
    setScrollY(-Math.max(0, activeLine - 1) * lineH)
  }, [typed, wordIndex, words, currentInput.length, caretX, caretY])

  useEffect(() => {
    if (errorTick === 0) return
    wordElAt(typed.length - 1)?.animate(
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
            <Word key={wi} w={w} input={typed[wi]} />
          ))}

          <Caret
            x={springX}
            y={caretY}
            visible={!blurred && status !== "finished"}
            typing={typing}
            innerRef={caretInnerRef}
          />
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
