import { memo } from "react"

function Footer() {
  return (
    <footer className="flex items-center justify-center gap-4 px-6 py-5 text-xs text-sub select-none">
      <span>crafted for flow</span>
      <span className="text-sub/40">·</span>
      <span className="flex items-center gap-1.5">
        <kbd className="rounded border-b-2 border-black/30 bg-surface px-1.5 py-0.5 font-mono">
          tab
        </kbd>
        restart test
      </span>
      <span className="flex items-center gap-1.5">
        <kbd className="rounded border-b-2 border-black/30 bg-surface px-1.5 py-0.5 font-mono">
          esc
        </kbd>
        menu
      </span>
    </footer>
  )
}

export default memo(Footer)
