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
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const fontSize = 16
    const FRAME_MS = 1000 / 24 /* authentic low-fi cadence */

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
      const n = Math.ceil(w / fontSize)
      drops = Array.from({ length: n }, () => ({
        y: Math.random() * (h / fontSize) - h / fontSize,
        speed: 0.5 + Math.random() * 1.1,
        bright: Math.random() < 0.05,
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

      /* phosphor trail fade */
      ctx.fillStyle = "rgba(2, 11, 6, 0.11)"
      ctx.fillRect(0, 0, w, h)
      ctx.font = `bold 15px "JetBrains Mono", monospace`

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i]
        const x = i * fontSize
        const y = d.y * fontSize

        /* the glowing head */
        ctx.fillStyle = d.bright ? "#eafff2" : "#8dffb5"
        ctx.shadowColor = "rgba(0, 255, 65, 0.8)"
        ctx.shadowBlur = d.bright ? 10 : 6
        ctx.fillText(d.glyph, x, y)
        ctx.shadowBlur = 0

        /* a dimmer glyph right behind the head */
        ctx.fillStyle = "rgba(0, 255, 65, 0.55)"
        ctx.fillText(randomGlyph(), x, y - fontSize)

        d.y += d.speed
        d.glyph = randomGlyph()

        /* occasionally flip a head to pure white for sparkle */
        if (Math.random() < 0.008) d.bright = !d.bright

        if (y - fontSize * 14 > h) {
          if (Math.random() > 0.976) {
            d.y = Math.random() * -18
            d.speed = 0.5 + Math.random() * 1.1
            d.bright = Math.random() < 0.05
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
