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

const DARK_RECTS = [
  { x: 27.5, y: 9, w: 9, h: 13, r: 4.5 },
  { x: 12, y: 27, w: 40, h: 9, r: 4.5 },
  { x: 27.5, y: 27, w: 9, h: 28, r: 4.5 },
]

const GRAD_A = [0xf6, 0xd5, 0x64]
const GRAD_B = [0xe2, 0xb7, 0x14]

/* gold diagonal gradient tile with a soft top shine */
function tileColor(x, y) {
  const t = (x + y) / (2 * S)
  let c = [
    GRAD_A[0] + (0xdc - GRAD_A[0]) * t,
    GRAD_A[1] + (0xa9 - GRAD_A[1]) * t,
    GRAD_A[2] + (0x0d - GRAD_A[2]) * t,
  ]
  const sy = y / S
  if (sy < 0.42) {
    const a = 0.3 * (1 - sy / 0.42)
    c = [
      c[0] + (255 - c[0]) * a,
      c[1] + (255 - c[1]) * a,
      c[2] + (255 - c[2]) * a,
    ]
  }
  return c.map((v) => Math.round(v))
}

function sample(x, y) {
  /* returns [r, g, b, a] in design space */
  const tile = insideRounded(x, y, 0, 0, S, S, 15)
  if (!tile) return [0, 0, 0, 0]

  /* depth shadow under the letterform */
  for (const rc of DARK_RECTS) {
    if (insideRounded(x, y, rc.x, rc.y + 1.6, rc.w, rc.h, rc.r)) {
      const c = tileColor(x, y)
      const a = 0.4
      return [
        Math.round(c[0] + (0x8a - c[0]) * a),
        Math.round(c[1] + (0x6a - c[1]) * a),
        Math.round(c[2] + (0x08 - c[2]) * a),
        255,
      ]
    }
  }

  /* white letterform + lit caret */
  for (const rc of DARK_RECTS) {
    if (insideRounded(x, y, rc.x, rc.y, rc.w, rc.h, rc.r)) {
      return rc.y === 9 ? [0xff, 0xfd, 0xf2, 255] : [255, 255, 255, 255]
    }
  }

  /* glow near the caret tip */
  const dx = (x - 32) / 13
  const dy = (y - 16.5) / 11
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d < 1) {
    const c = tileColor(x, y)
    const a = 0.75 * (1 - d)
    return [
      Math.round(c[0] + (255 - c[0]) * a),
      Math.round(c[1] + (249 - c[1]) * a),
      Math.round(c[2] + (224 - c[2]) * a),
      255,
    ]
  }

  return tileColor(x, y)
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
