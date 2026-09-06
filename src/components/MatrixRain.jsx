import { useEffect, useRef, memo } from "react"

/* half-width katakana + digits — the classic glyph soup */
const GLYPHS =
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:・.=*+-<>¦｜"

function randomGlyph() {
  return GLYPHS[(Math.random() * GLYPHS.length) | 0]
}

function MatrixRain() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
    const fontSize = 20
    const FRAME_MS = 1000 / 14 /* slow cinematic cadence, not arcade-fast */

    let drops = []
    let raf = 0
    let last = 0
    let w = 0
    let h = 0

    const seed = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      if (!w || !h) return
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = "#020b06"
      ctx.fillRect(0, 0, w, h)
      /* sparse premium density: ~45% columns, random gaps */
      const n = Math.ceil(w / fontSize)
      drops = Array.from({ length: n }, (_, i) => ({
        active: (i % 2 === 0 && Math.random() > 0.25) || Math.random() < 0.12,
        y: Math.random() * (h / fontSize) - h / fontSize,
        speed: 0.22 + Math.random() * 0.45,
        bright: Math.random() < 0.03,
        glyph: randomGlyph(),
      }))
    }

    const drawStatic = () => {
      /* dim frozen field for reduced motion */
      ctx.fillStyle = "#020b06"
      ctx.fillRect(0, 0, w, h)
      ctx.font = `15px "JetBrains Mono", monospace`
      for (const d of drops) {
        const x = drops.indexOf(d) * fontSize
        ctx.fillStyle = "rgba(0, 255, 65, 0.16)"
        for (let k = 0; k < 6; k++) {
          ctx.fillText(randomGlyph(), x, (d.y + k) * fontSize)
        }
      }
    }

    const tick = (ts) => {
      raf = requestAnimationFrame(tick)
      if (ts - last < FRAME_MS) return
      last = ts

      /* slow phosphor trail fade — longer trails, calmer motion */
      ctx.fillStyle = "rgba(2, 11, 6, 0.18)"
      ctx.fillRect(0, 0, w, h)
      ctx.font = `15px "JetBrains Mono", monospace`

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i]
        if (!d.active) continue
        const x = i * fontSize
        const y = d.y * fontSize

        /* soft glowing head — no harsh white */
        ctx.fillStyle = d.bright ? "#c9ffe0" : "#5fdc8c"
        ctx.shadowColor = "rgba(0, 255, 65, 0.45)"
        ctx.shadowBlur = d.bright ? 8 : 4
        ctx.fillText(d.glyph, x, y)
        ctx.shadowBlur = 0

        /* dimmer glyph right behind the head */
        ctx.fillStyle = "rgba(0, 255, 65, 0.32)"
        ctx.fillText(randomGlyph(), x, y - fontSize)

        d.y += d.speed
        d.glyph = randomGlyph()

        /* occasionally flip a head for subtle sparkle */
        if (Math.random() < 0.004) d.bright = !d.bright

        if (y - fontSize * 14 > h) {
          if (Math.random() > 0.965) {
            d.y = Math.random() * -18
            d.speed = 0.22 + Math.random() * 0.45
            d.bright = Math.random() < 0.03
          }
        }
      }
    }

    seed()
    if (reduced) {
      drawStatic()
    } else {
      raf = requestAnimationFrame(tick)
    }

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            seed()
            if (reduced) drawStatic()
          })
        : null
    ro?.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    />
  )
}

export default memo(MatrixRain)
