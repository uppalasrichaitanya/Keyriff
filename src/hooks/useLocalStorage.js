import { useCallback, useState } from "react"

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw == null) return initial
      const parsed = JSON.parse(raw)
      if (Array.isArray(initial)) return Array.isArray(parsed) ? parsed : initial
      if (initial && typeof initial === "object")
        return { ...initial, ...parsed }
      return parsed
    } catch {
      return initial
    }
  })

  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next
        try {
          localStorage.setItem(key, JSON.stringify(resolved))
        } catch {}
        return resolved
      })
    },
    [key]
  )

  return [value, set]
}
