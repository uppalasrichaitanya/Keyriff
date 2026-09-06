export const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true

export const SPRING = { type: "spring", stiffness: 220, damping: 26 }

/* shared-element spring: cross-screen morphs (e.g. live countdown → result
   wpm via layoutId="hero-wpm"). Slightly tighter than SPRING so the morph
   lands with intent instead of floating. */
export const MORPH_SPRING = { type: "spring", stiffness: 320, damping: 30 }

/* reusable stagger orchestration for card grids */
export const staggerParent = (stagger = 0.06, delay = 0.05) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
})

export const staggerChild = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 26 },
  },
}

/* screen-change transitions; blur is skipped for reduced motion */
export const screenMotion = (screen = "test") =>
  reduceMotion()
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : screen === "result"
      ? {
          initial: { opacity: 0, y: 64, filter: "blur(6px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          exit: {
            opacity: 0,
            y: 48,
            filter: "blur(5px)",
            transition: { duration: 0.22 },
          },
          transition: { type: "spring", stiffness: 280, damping: 22 },
        }
      : screen === "stats"
        ? {
            initial: { opacity: 0, x: 40, filter: "blur(6px)" },
            animate: { opacity: 1, x: 0, filter: "blur(0px)" },
            exit: {
              opacity: 0,
              x: -40,
              filter: "blur(5px)",
              transition: { duration: 0.22 },
            },
            transition: SPRING,
          }
        : {
            initial: { opacity: 0, y: 24, filter: "blur(6px)" },
            animate: { opacity: 1, y: 0, filter: "blur(0px)" },
            exit: {
              opacity: 0,
              y: -48,
              filter: "blur(5px)",
              transition: { duration: 0.22 },
            },
            transition: SPRING,
          }
