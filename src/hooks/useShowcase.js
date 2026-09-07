import { useEffect, useMemo, useRef } from "react"

/* ?showcase autoplay demo mode: scripted human-cadence typing for clean,
   deterministic footage (README GIFs) that doubles as a live demo.
   ?showcase&theme=ghost&kb=spectre pins the opening scene.
   Add &cycle to also rotate themes/boards over time. Cursor is hidden
   via html[data-showcase] (see index.css). */

export function isShowcase() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("showcase")
  )
}

const THEME_CYCLE = ["ghost", "midnight", "synthwave", "sakura", "ember", "abyss"]
const KB_CYCLE = ["spectre", "onyx", "deck", "monolith", "halo"]

export function useShowcase({ engine, setThemeId, setSettings, setSeenIntro, setScreen }) {
  const active = useMemo(() => isShowcase(), [])
  const live = useRef({ engine, setThemeId, setSettings, setSeenIntro, setScreen })

  useEffect(() => {
    live.current = { engine, setThemeId, setSettings, setSeenIntro, setScreen }
  })

  /* boot: pin scene from params, dismiss intro, tame modifiers */
  useEffect(() => {
    if (!active) return
    const q = new URLSearchParams(window.location.search)
    document.documentElement.dataset.showcase = "1"
    const api = live.current
    api.setSeenIntro(true)
    const theme = q.get("theme")
    const kb = q.get("kb")
    if (theme) api.setThemeId(theme)
    if (kb) api.setSettings((s) => ({ ...s, kbStyle: kb }))
    api.setSettings((s) => ({ ...s, forceCorrect: false, suddenDeath: false }))
    return () => {
      delete document.documentElement.dataset.showcase
    }
  }, [active])

  /* optional slow rotation for ambient demo pages */
  useEffect(() => {
    if (!active) return
    const q = new URLSearchParams(window.location.search)
    if (!q.has("cycle")) return undefined
    let ti = 0
    let ki = 0
    const id = setInterval(() => {
      ti = (ti + 1) % THEME_CYCLE.length
      live.current.setThemeId(THEME_CYCLE[ti])
      if (ti % 2 === 0) {
        ki = (ki + 1) % KB_CYCLE.length
        live.current.setSettings((s) => ({ ...s, kbStyle: KB_CYCLE[ki] }))
      }
    }, 12000)
    return () => clearInterval(id)
  }, [active])

  /* scripted typing loop with human cadence + rare uncorrected slips */
  useEffect(() => {
    if (!active) return undefined
    let alive = true
    let timer = 0
    const step = () => {
      if (!alive) return
      const { engine: eng, setScreen: go } = live.current
      if (eng.status === "finished") {
        timer = setTimeout(() => {
          if (!alive) return
          eng.restart()
          go("test")
          timer = setTimeout(step, 600)
        }, 2200)
        return
      }
      const wi = eng.typed.length - 1
      const cur = eng.typed[wi] ?? ""
      const target = eng.words[wi] ?? ""
      let ch
      if (target && cur.length >= target.length) {
        ch = " "
      } else if (target) {
        const want = target[cur.length]
        ch = Math.random() < 0.03 ? (want === "e" ? "r" : "e") : want
      }
      if (ch) eng.dispatchKey({ key: ch, preventDefault() {} })
      const pause = Math.random() < 0.06 ? 320 : 0
      timer = setTimeout(step, 90 + Math.random() * 90 + pause)
    }
    timer = setTimeout(step, 900)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [active])
}
