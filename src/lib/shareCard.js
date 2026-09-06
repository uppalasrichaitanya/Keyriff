const W = 1200
const H = 630

function readTheme() {
  const cs = getComputedStyle(document.documentElement)
  const v = (name, fallback) => cs.getPropertyValue(name).trim() || fallback
  return {
    base: v("--color-base", "#2b2d31"),
    text: v("--color-text", "#d8d9dc"),
    sub: v("--color-sub", "#686c73"),
    accent: v("--color-accent", "#e2b714"),
    accent2: v("--color-accent-2", "#e2b714"),
  }
}

function withAlpha(color, alpha) {
  if (color.startsWith("#") && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return color
}

/* theme id -> ambient flair family (mirrors themes.js flair assignments) */
const FLAIR_OF = {
  modern: "stars", midnight: "stars", starlight: "stars", tokyo: "stars", ghost: "stars",
  synthwave: "grid", vaporgrid: "grid",
  nebula: "mesh", monterey: "mesh", sunset: "mesh", goldhour: "mesh", rosepine: "mesh",
  matrix: "matrix",
  ember: "embers", mocha: "embers", matcha: "embers", gruvbox: "embers",
  abyss: "bubbles", dracula: "bubbles",
  evergreen: "snow", arctic: "snow", nordic: "snow",
  sakura: "petals", yozakura: "petals",
  cyberdeck: "rain",
}

/* deterministic PRNG so a theme's card looks the same every render */
function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* subtle flair-aware backdrop drawn under the existing glows */
function drawFlairBg(ctx, flair, t, themeId) {
  const rnd = mulberry(hashSeed(themeId || flair))
  if (flair === "stars") {
    for (let i = 0; i < 90; i++) {
      const x = rnd() * W
      const y = rnd() * H
      const r = rnd() < 0.85 ? 1.4 : 2.4
      ctx.fillStyle =
        rnd() < 0.7 ? withAlpha(t.text, 0.5) : withAlpha(t.accent, 0.65)
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    /* one shooting streak */
    const sx = 150 + rnd() * 500
    const sy2 = 60 + rnd() * 160
    const grad = ctx.createLinearGradient(sx, sy2, sx + 150, sy2)
    grad.addColorStop(0, "rgba(0,0,0,0)")
    grad.addColorStop(1, withAlpha(t.text, 0.55))
    ctx.strokeStyle = grad
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(sx, sy2)
    ctx.lineTo(sx + 150, sy2)
    ctx.stroke()
  } else if (flair === "grid") {
    const horizon = H * 0.62
    ctx.strokeStyle = withAlpha(t.accent, 0.35)
    ctx.lineWidth = 1.5
    for (let i = 0; i <= 12; i++) {
      const x = (i / 12) * W
      ctx.beginPath()
      ctx.moveTo(W / 2 + (x - W / 2) * 0.2, horizon)
      ctx.lineTo(W / 2 + (x - W / 2) * 2.2, H)
      ctx.stroke()
    }
    for (let i = 0; i < 5; i++) {
      const y = horizon + ((H - horizon) / 5) * i
      ctx.globalAlpha = 0.25 + i * 0.12
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    /* neon sun */
    const sunGrad = ctx.createLinearGradient(0, horizon - 130, 0, horizon)
    sunGrad.addColorStop(0, withAlpha(t.accent2, 0.85))
    sunGrad.addColorStop(1, withAlpha(t.accent, 0.85))
    ctx.fillStyle = sunGrad
    ctx.beginPath()
    ctx.arc(W / 2, horizon, 62, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = withAlpha(t.accent, 0.5)
    ctx.fillRect(0, horizon - 1, W, 2)
  } else if (flair === "mesh") {
    const blobs = [
      [W * 0.12, H * 0.1, 300, t.accent, 0.2],
      [W * 0.88, H * 0.3, 260, t.accent2, 0.16],
      [W * 0.45, H * 0.95, 320, t.accent, 0.12],
    ]
    for (const [x, y, rad, c, a] of blobs) {
      const g = ctx.createRadialGradient(x, y, 10, x, y, rad)
      g.addColorStop(0, withAlpha(c, a))
      g.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }
  } else if (flair === "matrix") {
    const glyphs = "ｱｲｳｴｵｶｷｸｹｺｻｼ0123456789"
    ctx.font = `15px ${FONT}`
    for (let col = 0; col < 40; col++) {
      const x = 20 + col * 30
      const len = 4 + Math.floor(rnd() * 8)
      for (let k = 0; k < len; k++) {
        const y = rnd() * H
        ctx.fillStyle =
          k === 0 ? withAlpha("#8dffb5", 0.5) : withAlpha("#00ff41", 0.22)
        ctx.fillText(glyphs[Math.floor(rnd() * glyphs.length)], x, y)
      }
    }
  } else if (flair === "rain") {
    for (let i = 0; i < 22; i++) {
      const x = rnd() * W
      const y = rnd() * H
      const len = 60 + rnd() * 120
      const g = ctx.createLinearGradient(x, y, x, y + len)
      g.addColorStop(0, "rgba(0,0,0,0)")
      g.addColorStop(1, withAlpha(t.accent, 0.3))
      ctx.strokeStyle = g
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + len)
      ctx.stroke()
    }
  } else if (flair === "embers" || flair === "snow" || flair === "petals" || flair === "bubbles") {
    const up = flair === "snow" || flair === "petals" ? 1 : -1
    for (let i = 0; i < 55; i++) {
      const x = rnd() * W
      const y = rnd() * H
      const r = flair === "bubbles" ? 2 + rnd() * 4 : 1 + rnd() * 2.4
      ctx.fillStyle =
        flair === "snow"
          ? "rgba(255,255,255,0.5)"
          : flair === "bubbles"
            ? withAlpha(t.accent2, 0.4)
            : withAlpha(up < 0 ? t.accent : t.accent2, 0.5)
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }
  ctx.fill()
}

/* draws the bare TAKT glyph (construction A) at (x, y) with size s.
   No container: beam with dovetail rhythm cuts + rigid stem, in ink color.
   Rendered on an isolated offscreen canvas so the cut knockouts can never
   punch through the card background. */
function drawLogo(ctx, x, y, s, ink) {
  const g = document.createElement("canvas")
  g.width = s
  g.height = s
  const c = g.getContext("2d")
  const k = s / 64
  const cuts = [
    [16.75, 20.25, 22.5, 15.5],
    [29.75, 33.25, 35.5, 28.5],
    [42.75, 46.25, 48.5, 41.5],
  ]
  c.fillStyle = "#fff"
  if (typeof c.roundRect === "function") {
    c.beginPath()
    c.roundRect(6 * k, 14 * k, 52 * k, 12 * k, 6 * k)
    c.fill()
  } else {
    c.fillRect(6 * k, 14 * k, 52 * k, 12 * k)
  }
  c.globalCompositeOperation = "destination-out"
  for (const [t0, t1, b1, b0] of cuts) {
    c.beginPath()
    c.moveTo(t0 * k, 19 * k)
    c.lineTo(t1 * k, 19 * k)
    c.lineTo(b1 * k, 27 * k)
    c.lineTo(b0 * k, 27 * k)
    c.closePath()
    c.fill()
  }
  c.globalCompositeOperation = "source-over"
  c.fillStyle = "#fff"
  if (typeof c.roundRect === "function") {
    c.beginPath()
    c.roundRect(27 * k, 24 * k, 10 * k, 32 * k, 5 * k)
    c.fill()
  } else {
    c.fillRect(27 * k, 24 * k, 10 * k, 32 * k)
  }
  /* tint the white glyph with ink via source-in, then stamp it */
  c.globalCompositeOperation = "source-in"
  c.fillStyle = ink
  c.fillRect(0, 0, s, s)
  ctx.drawImage(g, x, y)
}

const FONT = '"JetBrains Mono", ui-monospace, monospace'

export async function renderShareCard(result) {
  const t = readTheme()
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext("2d")

  try {
    if (document.fonts) {
      await Promise.all([
        document.fonts.load(`800 220px ${FONT}`, String(Math.round(result.wpm))),
        document.fonts.load(`800 54px ${FONT}`, "takt"),
        document.fonts.load(`700 40px ${FONT}`, "wpm"),
        document.fonts.load(`500 30px ${FONT}`, result.modeLabel),
      ])
    }
  } catch {}

  /* background */
  ctx.fillStyle = t.base
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, -140, 60, W / 2, -140, 760)
  glow.addColorStop(0, withAlpha(t.accent, 0.16))
  glow.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)
  const flair = ctx.createRadialGradient(W - 100, H + 80, 40, W - 100, H + 80, 700)
  flair.addColorStop(0, withAlpha(t.accent2, 0.12))
  flair.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = flair
  ctx.fillRect(0, 0, W, H)

  /* flair-aware backdrop (theme family illustration, kept subtle) */
  const themeId = document.documentElement.dataset.theme || ""
  drawFlairBg(ctx, FLAIR_OF[themeId], t, themeId)

  /* thin top accent border */
  const topBar = ctx.createLinearGradient(0, 0, W, 0)
  topBar.addColorStop(0, t.accent)
  topBar.addColorStop(1, t.accent2)
  ctx.fillStyle = topBar
  ctx.fillRect(0, 0, W, 6)

  /* brand */
  drawLogo(ctx, 64, 56, 92, t.text)
  ctx.fillStyle = t.accent
  ctx.font = `800 52px ${FONT}`
  ctx.fillText("takt", 184, 122)

  /* PB badge */
  if (result.isPb) {
    ctx.font = `700 26px ${FONT}`
    const label = "new personal best"
    const w = ctx.measureText(label).width + 44
    ctx.fillStyle = withAlpha(t.accent, 0.16)
    rr(ctx, W - w - 64, 76, w, 52, 26)
    ctx.fillStyle = t.accent
    ctx.fillText(label, W - w - 64 + 22, 111)
  }

  /* big wpm */
  const wpm = String(Math.round(result.wpm))
  ctx.fillStyle = t.text
  ctx.font = `800 220px ${FONT}`
  ctx.fillText(wpm, 64, 430)
  const wpmW = ctx.measureText(wpm).width
  ctx.fillStyle = t.sub
  ctx.font = `700 40px ${FONT}`
  ctx.fillText("wpm", 76 + wpmW, 428)

  /* stat row */
  const acc = `${result.accuracy}%`
  const con = `${Math.round(result.consistency)}%`
  const raw = String(Math.round(result.rawWpm))
  ctx.font = `800 40px ${FONT}`
  const cols = [
    ["accuracy", acc],
    ["consistency", con],
    ["raw wpm", raw],
  ]
  let cx = 64
  for (const [label, value] of cols) {
    ctx.fillStyle = t.text
    ctx.font = `800 40px ${FONT}`
    ctx.fillText(value, cx, 520)
    const valueW = ctx.measureText(value).width
    ctx.fillStyle = t.sub
    ctx.font = `500 22px ${FONT}`
    ctx.fillText(label.toUpperCase(), cx, 556)
    cx += valueW + 90
  }

  /* footer */
  const date = new Date(result.timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  ctx.fillStyle = t.sub
  ctx.font = `500 26px ${FONT}`
  ctx.fillText(`${result.modeLabel} · ${date}`, 64, 600)

  const dataUrl = canvas.toDataURL("image/png")
  const blob = await new Promise((res) => canvas.toBlob(res, "image/png"))
  return { dataUrl, blob }
}
