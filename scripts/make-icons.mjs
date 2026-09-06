/* Generates PWA PNG icons from the logo design (pure node, no deps). */
import zlib from "node:zlib"
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

/* ---------- tiny PNG encoder ---------- */

let CRC_TABLE = null
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      CRC_TABLE[n] = c
    }
  }
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePNG(width, height, rgba) {
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

/* ---------- logo rasterizer (64x64 design space) ---------- */

const S = 64

function insideRounded(px, py, x0, y0, w, h, r) {
  if (px < x0 || px > x0 + w || py < y0 || py > y0 + h) return false
  const dx = Math.min(px - x0, x0 + w - px)
  const dy = Math.min(py - y0, y0 + h - py)
  if (dx <= r && dy <= r) return (r - dx) ** 2 + (r - dy) ** 2 <= r * r
  return true
}

/* TAKT mark, construction A: tapered rhythm cuts in one beam + rigid stem.
   PWA icons are full-bleed charcoal (OS maskable requirement) — the bare
   glyph lives in logo.svg / favicon.svg / in-app SVG. */
const BEAM = { x: 6, y: 14, w: 52, h: 12, r: 6 }
const STEM = { x: 27, y: 24, w: 10, h: 32, r: 5 }
/* dovetail cutouts (black in mask space): narrow top, flared bottom */
const CUT_POLYS = [
  [[16.75, 19], [20.25, 19], [22.5, 27], [15.5, 27]],
  [[29.75, 19], [33.25, 19], [35.5, 27], [28.5, 27]],
  [[42.75, 19], [46.25, 19], [48.5, 27], [41.5, 27]],
]

function insidePoly(px, py, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

const TILE_TOP = [0x1e, 0x1e, 0x24]
const TILE_BOTTOM = [0x10, 0x10, 0x14]
const MARK = [0xf5, 0xf5, 0xf4]

/* flat charcoal tile with a barely-there vertical falloff */
function tileColor(x, y) {
  const t = y / S
  return [
    Math.round(TILE_TOP[0] + (TILE_BOTTOM[0] - TILE_TOP[0]) * t),
    Math.round(TILE_TOP[1] + (TILE_BOTTOM[1] - TILE_TOP[1]) * t),
    Math.round(TILE_TOP[2] + (TILE_BOTTOM[2] - TILE_TOP[2]) * t),
  ]
}

function sample(x, y) {
  /* returns [r, g, b, a] in design space — full-bleed charcoal for
     maskable safe zones; transparency only outside the 64px canvas */
  if (x < 0 || y < 0 || x > S || y > S) return [0, 0, 0, 0]

  /* monochrome mark, inset to 84% so circular masks never clip the beam
     ends or stem foot; tile stays full-bleed beneath */
  const gx = 32 + (x - 32) / 0.84
  const gy = 32 + (y - 32) / 0.84
  if (insideRounded(gx, gy, BEAM.x, BEAM.y, BEAM.w, BEAM.h, BEAM.r)) {
    for (const poly of CUT_POLYS) {
      if (insidePoly(gx, gy, poly)) return [...tileColor(x, y), 255]
    }
    return [MARK[0], MARK[1], MARK[2], 255]
  }
  if (insideRounded(gx, gy, STEM.x, STEM.y, STEM.w, STEM.h, STEM.r)) {
    return [MARK[0], MARK[1], MARK[2], 255]
  }

  return [...tileColor(x, y), 255]
}

function render(size) {
  const px = Buffer.alloc(size * size * 4)
  const scale = size / S
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (const oy of [0.25, 0.75]) {
        for (const ox of [0.25, 0.75]) {
          const [sr, sg, sb, sa] = sample((x + ox) / scale, (y + oy) / scale)
          r += sr * sa
          g += sg * sa
          b += sb * sa
          a += sa
        }
      }
      const o = (y * size + x) * 4
      px[o] = a ? Math.round(r / a) : 0
      px[o + 1] = a ? Math.round(g / a) : 0
      px[o + 2] = a ? Math.round(b / a) : 0
      px[o + 3] = Math.round(a / 4)
    }
  }
  return px
}

const out = __dirname + "/.."
writeFileSync(join(out, "public", "pwa-192.png"), encodePNG(192, 192, render(192)))
writeFileSync(join(out, "public", "pwa-512.png"), encodePNG(512, 512, render(512)))
writeFileSync(join(out, "public", "apple-touch-icon.png"), encodePNG(180, 180, render(180)))
console.log("wrote public/pwa-192.png, public/pwa-512.png, public/apple-touch-icon.png")
