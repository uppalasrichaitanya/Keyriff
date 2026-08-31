let ctx = null
let master = null
let noiseBuffer = null
let verb = null
let enabled = true
let volume = 0.7
export const DEFAULT_PACK = "tactile"
let packId = DEFAULT_PACK

export function setSoundEnabled(v) {
  enabled = v
}

export function setVolume(v) {
  volume = Math.min(1, Math.max(0, v))
  if (master) master.gain.value = volume
}

function audio() {
  if (!enabled) return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    /* compressor adds punch and headroom so louder gains stay clean */
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.knee.value = 12
    comp.ratio.value = 3.5
    comp.attack.value = 0.002
    comp.release.value = 0.12
    master = ctx.createGain()
    master.gain.value = volume * 1.35
    master.connect(comp)
    comp.connect(ctx.destination)
    buildReverb()
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {})
  return ctx
}

/* tiny synthetic room reverb for depth */
function buildReverb() {
  const len = Math.floor(ctx.sampleRate * 0.4)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
    }
  }
  verb = ctx.createConvolver()
  verb.buffer = buf
  const vg = ctx.createGain()
  vg.gain.value = 0.19
  verb.connect(vg)
  vg.connect(master)
}

function out(node) {
  node.connect(master)
  if (verb) node.connect(verb)
}

function noise(c) {
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, Math.floor(c.sampleRate * 0.12), c.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

function burst({ freq, type = "bandpass", q = 1, gain, duration }) {
  const c = ctx
  const t = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noise(c)
  src.playbackRate.value = 0.85 + Math.random() * 0.3
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(gain * (0.85 + Math.random() * 0.3), t)
  g.gain.exponentialRampToValueAtTime(0.001, t + duration)
  src.connect(f)
  f.connect(g)
  out(g)
  src.start(t)
  src.stop(t + duration + 0.02)
}

function tone({ freq, endFreq, type = "sine", gain, duration, delay = 0 }) {
  const c = ctx
  const t = c.currentTime + delay
  const o = c.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + duration)
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + duration)
  o.connect(g)
  out(g)
  o.start(t)
  o.stop(t + duration + 0.02)
}

/* ---------------- sound packs ---------------- */
/* every pack's key() receives { row } (0 = number row … 4 = bottom row):
   lower rows sit closer to the case and sound slightly deeper, like a real board */

const TACTILE = {
  key({ row = 2 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.035
    burst({ freq: (3100 + Math.random() * 800) * d, type: "bandpass", q: 1.9, gain: 0.17 * v, duration: 0.014 })
    burst({ freq: (520 + Math.random() * 170) * d, type: "bandpass", q: 1.1, gain: 0.54 * v, duration: 0.06 })
    tone({ freq: (138 + Math.random() * 28) * d, endFreq: 50 * d, type: "sine", gain: 0.72 * v, duration: 0.088 })
    tone({ freq: (215 + Math.random() * 35) * d, endFreq: 88 * d, type: "triangle", gain: 0.16 * v, duration: 0.03 })
  },
  release() {
    burst({ freq: 2500 + Math.random() * 700, type: "bandpass", q: 1.7, gain: 0.1, duration: 0.012 })
    tone({ freq: 185 + Math.random() * 35, endFreq: 98, type: "sine", gain: 0.16, duration: 0.032 })
  },
  space() {
    tone({ freq: 102, endFreq: 38, type: "sine", gain: 0.82, duration: 0.14 })
    burst({ freq: 360, type: "lowpass", gain: 0.42, duration: 0.085 })
    burst({ freq: 2700, type: "bandpass", q: 1.4, gain: 0.13, duration: 0.016 })
  },
}

/* Topre-style conical spring: rubbery deep purr, the HHKB signature */
const TOPRE = {
  key({ row = 2 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.04
    tone({ freq: (98 + Math.random() * 12) * d, endFreq: 54, type: "sine", gain: 0.66 * v, duration: 0.095 })
    burst({ freq: (880 + Math.random() * 220) * d, type: "bandpass", q: 1.3, gain: 0.36 * v, duration: 0.05 })
    burst({ freq: (1750 + Math.random() * 550) * d, type: "bandpass", q: 2.0, gain: 0.13 * v, duration: 0.018 })
  },
  release() {
    burst({ freq: 1400 + Math.random() * 500, type: "bandpass", q: 1.6, gain: 0.09, duration: 0.016 })
    tone({ freq: 130 + Math.random() * 25, endFreq: 80, type: "sine", gain: 0.15, duration: 0.035 })
  },
  space() {
    tone({ freq: 88, endFreq: 36, type: "sine", gain: 0.85, duration: 0.16 })
    burst({ freq: 620, type: "bandpass", q: 1.2, gain: 0.34, duration: 0.07 })
    burst({ freq: 2200, type: "bandpass", q: 1.5, gain: 0.11, duration: 0.018 })
  },
}

/* creamy lubed pops — soft, rounded, oddly addictive */
const BUBBLE = {
  key({ row = 2 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.05
    tone({ freq: (330 + Math.random() * 70) * d, endFreq: 118, type: "sine", gain: 0.56 * v, duration: 0.05 })
    burst({ freq: (1500 + Math.random() * 450) * d, type: "bandpass", q: 1.1, gain: 0.26 * v, duration: 0.028 })
    tone({ freq: (520 + Math.random() * 90) * d, endFreq: 255, type: "triangle", gain: 0.13 * v, duration: 0.024 })
  },
  release() {
    tone({ freq: 240 + Math.random() * 60, endFreq: 130, type: "sine", gain: 0.12, duration: 0.022 })
    burst({ freq: 1800, type: "bandpass", q: 1.2, gain: 0.06, duration: 0.01 })
  },
  space() {
    tone({ freq: 300, endFreq: 95, type: "sine", gain: 0.62, duration: 0.07 })
    tone({ freq: 210, endFreq: 70, type: "sine", gain: 0.4, duration: 0.1, delay: 0.045 })
    burst({ freq: 1100, type: "lowpass", gain: 0.3, duration: 0.06 })
  },
}

const THOCK = {
  key({ row = 2 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.035
    burst({ freq: (6000 + Math.random() * 2500) * d, type: "highpass", gain: 0.19 * v, duration: 0.012 })
    burst({ freq: (820 + Math.random() * 320) * d, type: "bandpass", q: 1.2, gain: 0.62 * v, duration: 0.06 })
    tone({ freq: (168 + Math.random() * 30) * d, endFreq: 58 * d, type: "sine", gain: 0.66 * v, duration: 0.075 })
  },
  release() {
    burst({ freq: 4200 + Math.random() * 1600, type: "highpass", gain: 0.1, duration: 0.01 })
    tone({ freq: 235 + Math.random() * 40, endFreq: 95, type: "sine", gain: 0.26, duration: 0.045 })
  },
  space() {
    tone({ freq: 118, endFreq: 42, type: "sine", gain: 0.78, duration: 0.12 })
    burst({ freq: 420, type: "lowpass", gain: 0.46, duration: 0.075 })
    burst({ freq: 3400, type: "highpass", gain: 0.09, duration: 0.012 })
  },
}

const CLICKY = {
  key({ row = 2 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.03
    burst({ freq: (7800 + Math.random() * 2000) * d, type: "highpass", gain: 0.22 * v, duration: 0.008 })
    burst({ freq: (4600 + Math.random() * 900) * d, type: "bandpass", q: 2.2, gain: 0.48 * v, duration: 0.022 })
    tone({ freq: (310 + Math.random() * 50) * d, endFreq: 180, type: "square", gain: 0.11 * v, duration: 0.02 })
  },
  release() {
    burst({ freq: 6400 + Math.random() * 1600, type: "highpass", gain: 0.16, duration: 0.008 })
  },
  space() {
    burst({ freq: 5200, type: "highpass", gain: 0.2, duration: 0.01 })
    tone({ freq: 210, endFreq: 85, type: "sine", gain: 0.56, duration: 0.07 })
    burst({ freq: 900, type: "bandpass", q: 1.5, gain: 0.32, duration: 0.04 })
  },
}

const TYPEWRITER = {
  key({ row = 2 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.03
    burst({ freq: (2300 + Math.random() * 700) * d, type: "bandpass", q: 2.4, gain: 0.56 * v, duration: 0.035 })
    tone({ freq: (1850 + Math.random() * 250) * d, endFreq: 720, type: "triangle", gain: 0.28 * v, duration: 0.03 })
    tone({ freq: (145 + Math.random() * 20) * d, endFreq: 65, type: "sine", gain: 0.42 * v, duration: 0.05 })
  },
  release() {
    burst({ freq: 3000 + Math.random() * 1000, type: "highpass", gain: 0.13, duration: 0.014 })
  },
  space() {
    /* carriage bell */
    tone({ freq: 1318.5, type: "sine", gain: 0.22, duration: 0.42 })
    tone({ freq: 2637, type: "sine", gain: 0.07, duration: 0.3 })
    tone({ freq: 110, endFreq: 50, type: "sine", gain: 0.54, duration: 0.09 })
    burst({ freq: 700, type: "lowpass", gain: 0.32, duration: 0.05 })
  },
}

const LINEAR = {
  key({ row = 2 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.04
    burst({ freq: (480 + Math.random() * 140) * d, type: "lowpass", gain: 0.44 * v, duration: 0.04 })
    tone({ freq: (128 + Math.random() * 20) * d, endFreq: 62 * d, type: "sine", gain: 0.5 * v, duration: 0.06 })
  },
  release() {
    burst({ freq: 900 + Math.random() * 300, type: "lowpass", gain: 0.13, duration: 0.02 })
  },
  space() {
    tone({ freq: 96, endFreq: 44, type: "sine", gain: 0.6, duration: 0.1 })
    burst({ freq: 380, type: "lowpass", gain: 0.36, duration: 0.06 })
  },
}

/* crystalline glass taps with a bright ring */
const GLASS = {
  key({ row = 2 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.03
    burst({ freq: (6200 + Math.random() * 1600) * d, type: "highpass", gain: 0.13 * v, duration: 0.008 })
    tone({ freq: (1720 + Math.random() * 320) * d, endFreq: (1180 + Math.random() * 140) * d, type: "sine", gain: 0.34 * v, duration: 0.11 })
    tone({ freq: (2590 + Math.random() * 420) * d, type: "sine", gain: 0.12 * v, duration: 0.055 })
    tone({ freq: (334 + Math.random() * 44) * d, endFreq: 148, type: "triangle", gain: 0.14 * v, duration: 0.028 })
  },
  release() {
    burst({ freq: 5200 + Math.random() * 1400, type: "highpass", gain: 0.07, duration: 0.008 })
    tone({ freq: 1980 + Math.random() * 260, type: "sine", gain: 0.07, duration: 0.05 })
  },
  space() {
    tone({ freq: 880, endFreq: 420, type: "sine", gain: 0.3, duration: 0.14 })
    tone({ freq: 1320, type: "sine", gain: 0.1, duration: 0.08 })
    burst({ freq: 900, type: "lowpass", gain: 0.3, duration: 0.05 })
    burst({ freq: 4400, type: "highpass", gain: 0.09, duration: 0.012 })
  },
}

/* hollow bamboo clack — woody, warm, organic */
const BAMBOO = {
  key({ row = 2 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.045
    burst({ freq: (820 + Math.random() * 220) * d, type: "bandpass", q: 1.4, gain: 0.5 * v, duration: 0.045 })
    tone({ freq: (196 + Math.random() * 26) * d, endFreq: 88 * d, type: "triangle", gain: 0.5 * v, duration: 0.07 })
    tone({ freq: (392 + Math.random() * 40) * d, endFreq: 210, type: "sine", gain: 0.2 * v, duration: 0.04 })
    burst({ freq: (2400 + Math.random() * 500) * d, type: "bandpass", q: 2.0, gain: 0.09 * v, duration: 0.012 })
  },
  release() {
    burst({ freq: 1200 + Math.random() * 400, type: "bandpass", q: 1.5, gain: 0.1, duration: 0.016 })
  },
  space() {
    tone({ freq: 150, endFreq: 56, type: "triangle", gain: 0.7, duration: 0.12 })
    burst({ freq: 500, type: "bandpass", q: 1.2, gain: 0.42, duration: 0.06 })
    burst({ freq: 1800, type: "bandpass", q: 1.6, gain: 0.1, duration: 0.014 })
  },
}

export const SOUND_PACKS = [
  { id: "tactile", name: "tactile" },
  { id: "topre", name: "topre" },
  { id: "bubble", name: "bubble" },
  { id: "thock", name: "thock" },
  { id: "clicky", name: "clicky" },
  { id: "typewriter", name: "typewriter" },
  { id: "linear", name: "linear" },
  { id: "glass", name: "glass" },
  { id: "bamboo", name: "bamboo" },
]

const PACKS = {
  tactile: TACTILE,
  topre: TOPRE,
  bubble: BUBBLE,
  thock: THOCK,
  clicky: CLICKY,
  typewriter: TYPEWRITER,
  linear: LINEAR,
  glass: GLASS,
  bamboo: BAMBOO,
}

export function setPack(id) {
  if (PACKS[id]) packId = id
}

export function playKey(opts) {
  if (!audio()) return
  PACKS[packId].key(opts)
}

export function playRelease() {
  if (!audio()) return
  PACKS[packId].release()
}

export function playSpace() {
  if (!audio()) return
  PACKS[packId].space()
}

export function playError() {
  if (!audio()) return
  tone({ freq: 118, endFreq: 76, type: "triangle", gain: 0.3, duration: 0.085 })
  burst({ freq: 1900, type: "bandpass", q: 0.9, gain: 0.08, duration: 0.028 })
}

export function playFinish() {
  if (!audio()) return
  ;[523.25, 659.25, 783.99].forEach((f, i) =>
    tone({ freq: f, type: "triangle", gain: 0.3, duration: 0.34, delay: i * 0.09 })
  )
  tone({ freq: 1046.5, type: "sine", gain: 0.2, duration: 0.55, delay: 0.27 })
  tone({ freq: 391.99, type: "sine", gain: 0.14, duration: 0.6, delay: 0.27 })
}

/* final 3-second countdown tick */
export function playTick() {
  if (!audio()) return
  burst({ freq: 1800, type: "bandpass", q: 2, gain: 0.3, duration: 0.02 })
  tone({ freq: 940, endFreq: 720, type: "sine", gain: 0.24, duration: 0.045 })
}

/* streak milestone sparkle */
export function playMilestone() {
  if (!audio()) return
  tone({ freq: 880, type: "sine", gain: 0.18, duration: 0.12 })
  tone({ freq: 1318.51, type: "sine", gain: 0.16, duration: 0.16, delay: 0.08 })
}

/* bigger ascending run for personal records */
export function playRecord() {
  if (!audio()) return
  ;[659.25, 783.99, 987.77, 1318.51].forEach((f, i) =>
    tone({ freq: f, type: "triangle", gain: 0.26, duration: 0.22, delay: i * 0.07 })
  )
  tone({ freq: 1567.98, type: "sine", gain: 0.16, duration: 0.45, delay: 0.3 })
  tone({ freq: 391.99, type: "sine", gain: 0.12, duration: 0.55, delay: 0.3 })
}
