import { motion } from "framer-motion"

export default function Caret({ x, y, visible, typing, innerRef }) {
  /* visuals (line | block | underline) are pure CSS driven by
     html[data-caret] so switching styles never needs a re-render.
     Width lives in .caret-motion (see index.css), not inline. */
  return (
    <motion.div
      className="caret-motion pointer-events-none absolute left-0 top-0 z-20 will-change-transform"
      initial={false}
      style={{ x, y, height: "1.2em", marginTop: "0.24em", filter: "drop-shadow(0 0 6px var(--color-accent))", transition: "opacity 0.25s, background-color 0.25s" }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ opacity: { duration: 0.12 } }}
    >
      <div
        ref={innerRef}
        style={{ transition: "opacity 0.25s, background-color 0.25s" }}
        className={`caret-bar h-full w-full rounded-full ${
          typing ? "" : "animate-blink"
        }`}
      />
    </motion.div>
  )
}
