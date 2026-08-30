import { memo, useSyncExternalStore } from "react"
import { isTimedMode } from "../lib/engine"

function ProgressBar({
  subscribeClock,
  getClock,
  settings,
  wordCount,
  typedCount,
}) {
  const elapsed = useSyncExternalStore(subscribeClock, getClock)
  const timed = isTimedMode(settings.mode)
  const ratio = timed
    ? elapsed / (settings.timeValue * 1000)
    : wordCount
      ? typedCount / wordCount
      : 0
  const remaining = timed ? settings.timeValue * 1000 - elapsed : Infinity
  const urgent = elapsed > 0 && remaining <= 5000
  return (
    <div className="mx-auto mt-2 h-[3px] w-[96%] overflow-hidden rounded-full bg-surface-hi/50">
      <div
        className={`h-full rounded-full transition-[width,background-color] duration-200 ease-linear ${
          urgent ? "bg-error" : "bg-accent"
        }`}
        style={{ width: `${Math.min(1, ratio) * 100}%` }}
      />
    </div>
  )
}

export default memo(ProgressBar)
