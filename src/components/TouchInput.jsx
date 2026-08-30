import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

function TouchInput({ dispatchKey, registerFocus }) {
  const inputRef = useRef(null)
  const [focused, setFocused] = useState(false)
  const focusRef = useRef(() => {})

  useEffect(() => {
    focusRef.current = () => inputRef.current?.focus()
    registerFocus?.(() => focusRef.current())
  }, [registerFocus])

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        enterKeyHint="next"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        aria-label="typing input"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          dispatchKey(e)
        }}
        onKeyUp={(e) => e.preventDefault()}
        onChange={() => {
          if (inputRef.current) inputRef.current.value = ""
        }}
        className="fixed left-1/2 top-1/2 h-px w-px -translate-x-1/2 -translate-y-1/2 opacity-0"
      />
      <AnimatePresence>
        {!focused && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={() => focusRef.current()}
            className="grad-accent shadow-accent fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-bold text-[color:var(--color-base)]"
          >
            tap to type
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}

export default TouchInput
