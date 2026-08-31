/* WCAG contrast audit for theme palettes (sub/error/errorExtra vs base) */
import { THEMES } from "../src/lib/themes.js"

function lum(hex) {
  const h = hex.replace("#", "")
  const ch = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

function contrast(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

let flagged = 0
for (const t of THEMES) {
  if (!t.base?.startsWith("#")) {
    console.log(`${t.id}: SKIP (non-hex base)`)
    continue
  }
  const c = (v, min) => {
    if (!v?.startsWith("#")) return null
    const r = contrast(v, t.base)
    return r < min ? r.toFixed(2) : null
  }
  const flags = [
    c(t.sub, 3) && `sub=${c(t.sub, 3)}`,
    c(t.error, 2) && `error=${c(t.error, 2)}`,
    c(t.errorExtra, 1.6) && `errorExtra=${c(t.errorExtra, 1.6)}`,
    c(t.accent, 2) && `accent=${c(t.accent, 2)}`,
  ].filter(Boolean)
  if (flags.length) {
    flagged++
    console.log(`${t.id}: ${flags.join(", ")}`)
  }
}
console.log(`${flagged} themes flagged`)
