import { memo, useSyncExternalStore } from "react"

function ProgressBar({ subscribeClock, getClock, getLimit, wordCount, typedCount }) {
  const elapsed = useSyncExternalStore(subscribeClock, getClock)
  const limitMs = getLimit()
  const timed = limitMs !== Infinity
  const ratio = timed
    ? elapsed / limitMs
    : wordCount
      ? typedCount / wordCount
      : 0
  const remaining = limitMs - elapsed
  const urgent = timed && elapsed > 0 && remaining <= 5000 && remaining > -1000
  return (
    <div className="mx-auto mt-2 h-[4px] w-[96%] overflow-hidden rounded-full bg-surface-hi/50">
      <div
        className={`h-full w-full origin-left rounded-full transition-[background-color] duration-200 ${
          urgent ? "bg-error" : ""
        }`}
        style={{
          transform: `scaleX(${Math.min(1, Math.max(0, ratio))})`,
          backgroundImage: urgent
            ? undefined
            : "linear-gradient(90deg, var(--color-accent), var(--color-accent-2))",
        }}
      />
    </div>
  )
}

export default memo(ProgressBar)
