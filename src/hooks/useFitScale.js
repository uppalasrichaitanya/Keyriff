import { useEffect, useRef, useState } from "react"

/* Scales a fixed-design-width element down to fit its container
   (and the visible viewport height), like a physical keyboard
   shrinking on a phone. Returns a ref for the measuring wrapper
   and a transform: scale value. */
export function useFitScale(designWidth = 680, designHeight = 352) {
  const ref = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth || 0
        if (!w) return
        const vv = window.visualViewport
        const availH = vv ? vv.height : window.innerHeight
        const s = Math.min(1, w / designWidth, (availH * 0.44) / designHeight)
        setScale((prev) => (Math.abs(prev - s) > 0.005 ? s : prev))
      })
    }
    measure()
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      return () => {
        ro.disconnect()
        cancelAnimationFrame(raf)
      }
    }
    window.addEventListener("resize", measure)
    return () => {
      window.removeEventListener("resize", measure)
      cancelAnimationFrame(raf)
    }
  }, [designWidth, designHeight])

  return { ref, scale }
}
