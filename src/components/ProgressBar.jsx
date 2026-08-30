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
    <div className="mx-auto mt-2 h-[3px] w-[96%] overflow-hidden rounded-full bg-surface-hi/50">
      <div
        className={`h-full w-full origin-left rounded-full transition-[background-color] duration-200 ${
          urgent ? "bg-error" : "bg-accent"
        }`}
        style={{ transform: `scaleX(${Math.min(1, Math.max(0, ratio))})` }}
      />
    </div>
  )
}

export default memo(ProgressBar)
