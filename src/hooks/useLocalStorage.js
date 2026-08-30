import { useCallback, useRef, useState } from "react"

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw == null) return initial
      const parsed = JSON.parse(raw)
      if (Array.isArray(initial)) return Array.isArray(parsed) ? parsed : initial
      if (initial && typeof initial === "object") {
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? { ...initial, ...parsed }
          : initial
      }
      return typeof parsed === typeof initial ? parsed : initial
    } catch {
      return initial
    }
  })

  const valueRef = useRef(value)

  const set = useCallback(
    (next) => {
      const resolved =
        typeof next === "function" ? next(valueRef.current) : next
      valueRef.current = resolved
      setValue(resolved)
      try {
        localStorage.setItem(key, JSON.stringify(resolved))
      } catch {}
    },
    [key]
  )

  return [value, set]
}
