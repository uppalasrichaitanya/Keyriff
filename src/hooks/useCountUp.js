import { useEffect, useRef, useState } from "react"

export function useCountUp(target, { duration = 900, decimals = 0 } = {}) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(0)

  useEffect(() => {
    let start
    const easeOutExpo = (p) => (p === 1 ? 1 : 1 - Math.pow(2, -10 * p))
    const step = (ts) => {
      start ??= ts
      const p = Math.min(1, (ts - start) / duration)
      setValue(target * easeOutExpo(p))
      if (p < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return (value * Math.pow(10, decimals)).toFixed(decimals)
}
