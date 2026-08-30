import { motion } from "framer-motion"

export default function Caret({ x, y, visible, typing, innerRef }) {
  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-20 will-change-transform"
      initial={false}
      style={{ x, y, height: "1.2em", width: 3, marginTop: "0.24em" }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ opacity: { duration: 0.12 } }}
    >
      <div
        ref={innerRef}
        className={`caret-bar h-full w-full rounded-full ${
          typing ? "" : "animate-blink"
        }`}
      />
    </motion.div>
  )
}
