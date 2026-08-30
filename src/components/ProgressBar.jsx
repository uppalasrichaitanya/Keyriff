import { memo, useSyncExternalStore } from "react"

function ProgressBar({
  subscribeClock,
  getClock,
  settings,
  wordCount,
  typedCount,
}) {
  const elapsed = useSyncExternalStore(subscribeClock, getClock)
  const ratio =
    settings.mode === "time"
      ? elapsed / (settings.timeValue * 1000)
      : wordCount
        ? typedCount / wordCount
        : 0
  return (
    <div className="mx-auto mt-2 h-[3px] w-[96%] overflow-hidden rounded-full bg-surface-hi/50">
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-200 ease-linear"
        style={{ width: `${Math.min(1, ratio) * 100}%` }}
      />
    </div>
  )
}

export default memo(ProgressBar)
