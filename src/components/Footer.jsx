import { memo } from "react"

function Footer() {
  return (
    <footer className="safe-bottom flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-4 text-xs text-sub select-none sm:px-6 sm:py-5">
      <span>crafted for flow</span>
      <span className="hidden text-sub/40 sm:inline">·</span>
      <span className="hidden items-center gap-1.5 sm:flex">
        <kbd className="rounded border-b-2 border-black/30 bg-surface px-1.5 py-0.5 font-mono">
          tab
        </kbd>
        restart test
      </span>
      <span className="hidden items-center gap-1.5 sm:flex">
        <kbd className="rounded border-b-2 border-black/30 bg-surface px-1.5 py-0.5 font-mono">
          esc
        </kbd>
        menu
      </span>
    </footer>
  )
}

export default memo(Footer)
