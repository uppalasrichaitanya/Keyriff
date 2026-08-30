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

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

/* draws the logo tile (rounded square + T) at (x, y) with size s */
function drawLogo(ctx, x, y, s, base) {
  const k = s / 64
  const grad = ctx.createLinearGradient(x, y, x + s, y + s)
  grad.addColorStop(0, base.accent2)
  grad.addColorStop(1, base.accent)
  ctx.fillStyle = grad
  rr(ctx, x, y, s, s, 14 * k)
  ctx.fillStyle = base.base
  rr(ctx, x + 27.5 * k, y + 9 * k, 9 * k, 13 * k, 4.5 * k)
  rr(ctx, x + 12 * k, y + 27 * k, 40 * k, 9 * k, 4.5 * k)
  rr(ctx, x + 27.5 * k, y + 27 * k, 9 * k, 28 * k, 4.5 * k)
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
        document.fonts.load(`800 54px ${FONT}`, "typer"),
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

  /* brand */
  drawLogo(ctx, 64, 56, 92, t)
  ctx.fillStyle = t.accent
  ctx.font = `800 52px ${FONT}`
  ctx.fillText("typer", 184, 122)

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
    ctx.fillStyle = t.sub
    ctx.font = `500 22px ${FONT}`
    ctx.fillText(label.toUpperCase(), cx, 556)
    cx += ctx.measureText(value).width + 90
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
