export const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true

export const SPRING = { type: "spring", stiffness: 220, damping: 26 }

/* screen-change transitions; blur is skipped for reduced motion */
export const screenMotion = () =>
  reduceMotion()
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, y: 16, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -14, filter: "blur(5px)", transition: { duration: 0.18 } },
        transition: SPRING,
      }
