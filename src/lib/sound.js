/* ================= ENGINE: context, mix bus, humanize state ================= */

let ctx = null
let master = null
let noiseBuffer = null
let verb = null
let verbSend = null
let panner = null
let enabled = true
let volume = 0.7
export const DEFAULT_PACK = "tactile"
let packId = DEFAULT_PACK
/* stereo pan for the current sound (-1 left … 1 right) */
let pan = 0
/* per-pack reverb send, set by setPack() */
let currentVerbSend = 0.16

/* ---- humanize: per-hit feel shared by every layer of one keystroke ----
   velocity follows rhythm (burst typing = lighter + tighter, deliberate =
   fuller); round-robin cycles 4 deterministic variants so repeated keys
   never machine-gun. Set fresh by playKey/playSpace/playRelease. */
const RR_TUNE = [1, 1.025, 0.978, 1.012]
const RR_GAIN = [1, 0.96, 1.03, 0.99]
const human = { vel: 1, bright: 1, tune: 1, hgain: 1 }
let rrStep = 0
let lastHitT = 0

function humanizeHit() {
  const now = performance.now()
  const dt = lastHitT ? now - lastHitT : 500
  lastHitT = now
  /* velocity: full body when deliberate, lighter when flying */
  human.vel = Math.min(1, Math.max(0.75, 0.75 + dt / 800))
  /* brightness: staccato bursts stay crisp, slow presses bloom */
  human.bright = Math.min(1.08, Math.max(0.9, 0.9 + dt / 1500))
  rrStep = (rrStep + 1) % 4
  human.tune = RR_TUNE[rrStep]
  human.hgain = RR_GAIN[rrStep]
}

function neutralizeHit() {
  human.vel = 1
  human.bright = 1
  human.tune = 1
  human.hgain = 1
}

export function setSoundEnabled(v) {
  enabled = v
}

function perceptualGain(v) {
  return Math.pow(Math.min(1, Math.max(0, v)), 1.4)
}

export function setVolume(v) {
  volume = Math.min(1, Math.max(0, v))
  if (master) master.gain.value = perceptualGain(volume)
}

function audio() {
  if (!enabled) return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    /* gentle glue: only catches peaks so 100% stays punchy but clean */
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.knee.value = 18
    comp.ratio.value = 2.5
    comp.attack.value = 0.002
    comp.release.value = 0.12
    master = ctx.createGain()
    master.gain.value = perceptualGain(volume)
    /* tape-style glue: soft saturation warms transients before the comp */
    const shaper = ctx.createWaveShaper()
    const curve = new Float32Array(256)
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1
      curve[i] = Math.tanh(2 * x) / Math.tanh(2)
    }
    shaper.curve = curve
    shaper.oversample = "2x"
    master.connect(shaper)
    shaper.connect(comp)
    comp.connect(ctx.destination)
    buildReverb()
    /* one persistent panner reused per keystroke (no per-hit node churn) */
    if (typeof ctx.createStereoPanner === "function") {
      panner = ctx.createStereoPanner()
      panner.pan.value = 0
      panner.connect(master)
    } else {
      panner = null
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {})
  return ctx
}

/* tiny synthetic room reverb for depth (shared 0.4s buffer, per-pack send) */
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
  verbSend = ctx.createGain()
  verbSend.gain.value = currentVerbSend
  verb.connect(verbSend)
  verbSend.connect(master)
}

function out(node) {
  if (panner) {
    panner.pan.value = Math.max(-1, Math.min(1, pan))
    node.connect(panner)
  } else {
    node.connect(master)
  }
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

/* ================= PRIMITIVES: filtered noise + pitched body =================
   every layer automatically inherits the current hit's humanize feel
   (velocity gain, brightness, round-robin detune) — packs stay untouched */

function burst({ freq, type = "bandpass", q = 1, gain, duration }) {
  const c = ctx
  const t = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noise(c)
  src.playbackRate.value = 0.85 + Math.random() * 0.3
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = freq * human.tune * human.bright
  f.Q.value = q
  const g = c.createGain()
  /* fast bursts tighten up (shorter tail), deliberate presses bloom */
  const dur = duration * (0.85 + 0.15 * human.vel)
  g.gain.setValueAtTime(gain * human.vel * human.hgain * (0.85 + Math.random() * 0.3), t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(f)
  f.connect(g)
  out(g)
  src.start(t)
  src.stop(t + dur + 0.02)
}

function tone({ freq, endFreq, type = "sine", gain, duration, delay = 0 }) {
  const c = ctx
  const t = c.currentTime + delay
  const o = c.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq * human.tune, t)
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq * human.tune, t + duration)
  const g = c.createGain()
  g.gain.setValueAtTime(gain * human.vel * human.hgain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + duration)
  o.connect(g)
  out(g)
  o.start(t)
  o.stop(t + duration + 0.02)
}

/* subtle per-column detune (±2% across the board) so fast typing
   doesn't machine-gun; row depth (d) still carries the main pitch ladder */
function colPitch(opts) {
  const col = opts?.col ?? 0
  return 1 + col * 0.02
}

/* ---------------- sound packs ---------------- */
/* every pack's key() receives { row, col } (row 0 = number row … 4 = bottom;
   col -1 … 1 across the board): lower rows sit closer to the case and sound
   slightly deeper, like a real board; col adds a subtle ±2% detune */

const TACTILE = {
  verb: 0.16,
  key({ row = 2, col = 0 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.035
    const pc = colPitch({ col })
    /* tighter + clickier top than thock: brighter transient, shorter body */
    burst({ freq: (3600 + Math.random() * 900) * d * pc, type: "bandpass", q: 2.2, gain: 0.22 * v, duration: 0.012 })
    burst({ freq: (520 + Math.random() * 170) * d * pc, type: "bandpass", q: 1.1, gain: 0.5 * v, duration: 0.05 })
    tone({ freq: (138 + Math.random() * 28) * d * pc, endFreq: 50 * d * pc, type: "sine", gain: 0.66 * v, duration: 0.075 })
    tone({ freq: (215 + Math.random() * 35) * d * pc, endFreq: 88 * d * pc, type: "triangle", gain: 0.16 * v, duration: 0.03 })
  },
  release() {
    burst({ freq: 2500 + Math.random() * 700, type: "bandpass", q: 1.7, gain: 0.1, duration: 0.012 })
    tone({ freq: 185 + Math.random() * 35, endFreq: 98, type: "sine", gain: 0.16, duration: 0.032 })
  },
  space() {
    tone({ freq: 102, endFreq: 38, type: "sine", gain: 0.78, duration: 0.14 })
    burst({ freq: 360, type: "lowpass", gain: 0.42, duration: 0.085 })
    burst({ freq: 2700, type: "bandpass", q: 1.4, gain: 0.13, duration: 0.016 })
  },
}

/* Topre-style conical spring: rubbery deep purr, the HHKB signature */
const TOPRE = {
  verb: 0.15,
  key({ row = 2, col = 0 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.04
    const pc = colPitch({ col })
    tone({ freq: (98 + Math.random() * 12) * d * pc, endFreq: 54 * pc, type: "sine", gain: 0.66 * v, duration: 0.095 })
    burst({ freq: (880 + Math.random() * 220) * d * pc, type: "bandpass", q: 1.3, gain: 0.36 * v, duration: 0.05 })
    burst({ freq: (1750 + Math.random() * 550) * d * pc, type: "bandpass", q: 2.0, gain: 0.13 * v, duration: 0.018 })
  },
  release() {
    burst({ freq: 1400 + Math.random() * 500, type: "bandpass", q: 1.6, gain: 0.09, duration: 0.016 })
    tone({ freq: 130 + Math.random() * 25, endFreq: 80, type: "sine", gain: 0.15, duration: 0.035 })
  },
  space() {
    tone({ freq: 88, endFreq: 36, type: "sine", gain: 0.78, duration: 0.16 })
    burst({ freq: 620, type: "bandpass", q: 1.2, gain: 0.34, duration: 0.07 })
    burst({ freq: 2200, type: "bandpass", q: 1.5, gain: 0.11, duration: 0.018 })
  },
}

/* creamy lubed pops — soft, rounded, oddly addictive */
const BUBBLE = {
  verb: 0.16,
  key({ row = 2, col = 0 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.05
    const pc = colPitch({ col })
    tone({ freq: (330 + Math.random() * 70) * d * pc, endFreq: 118 * pc, type: "sine", gain: 0.56 * v, duration: 0.05 })
    burst({ freq: (1500 + Math.random() * 450) * d * pc, type: "bandpass", q: 1.1, gain: 0.26 * v, duration: 0.028 })
    tone({ freq: (520 + Math.random() * 90) * d * pc, endFreq: 255 * pc, type: "triangle", gain: 0.13 * v, duration: 0.024 })
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
  verb: 0.17,
  key({ row = 2, col = 0 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.035
    const pc = colPitch({ col })
    /* deeper + rounder than tactile: softer transient, lower body, longer tail */
    burst({ freq: (6000 + Math.random() * 2500) * d * pc, type: "highpass", gain: 0.12 * v, duration: 0.012 })
    burst({ freq: (680 + Math.random() * 260) * d * pc, type: "bandpass", q: 1.2, gain: 0.58 * v, duration: 0.075 })
    tone({ freq: (140 + Math.random() * 24) * d * pc, endFreq: 48 * d * pc, type: "sine", gain: 0.68 * v, duration: 0.1 })
  },
  release() {
    burst({ freq: 4200 + Math.random() * 1600, type: "highpass", gain: 0.1, duration: 0.01 })
    tone({ freq: 235 + Math.random() * 40, endFreq: 95, type: "sine", gain: 0.26, duration: 0.045 })
  },
  space() {
    tone({ freq: 118, endFreq: 42, type: "sine", gain: 0.76, duration: 0.12 })
    burst({ freq: 420, type: "lowpass", gain: 0.46, duration: 0.075 })
    burst({ freq: 3400, type: "highpass", gain: 0.09, duration: 0.012 })
  },
}

const CLICKY = {
  verb: 0.08,
  key({ row = 2, col = 0 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.03
    const pc = colPitch({ col })
    burst({ freq: (7800 + Math.random() * 2000) * d * pc, type: "highpass", gain: 0.22 * v, duration: 0.008 })
    burst({ freq: (4600 + Math.random() * 900) * d * pc, type: "bandpass", q: 2.2, gain: 0.48 * v, duration: 0.022 })
    tone({ freq: (310 + Math.random() * 50) * d * pc, endFreq: 180 * pc, type: "square", gain: 0.11 * v, duration: 0.02 })
  },
  release() {
    burst({ freq: 6400 + Math.random() * 1600, type: "highpass", gain: 0.17, duration: 0.008 })
    tone({ freq: 170 + Math.random() * 30, endFreq: 90, type: "sine", gain: 0.18, duration: 0.04 })
  },
  space() {
    burst({ freq: 5200, type: "highpass", gain: 0.2, duration: 0.01 })
    tone({ freq: 210, endFreq: 85, type: "sine", gain: 0.56, duration: 0.07 })
    burst({ freq: 900, type: "bandpass", q: 1.5, gain: 0.32, duration: 0.04 })
  },
}

const TYPEWRITER = {
  verb: 0.07,
  key({ row = 2, col = 0 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.03
    const pc = colPitch({ col })
    burst({ freq: (2300 + Math.random() * 700) * d * pc, type: "bandpass", q: 2.4, gain: 0.56 * v, duration: 0.035 })
    tone({ freq: (1850 + Math.random() * 250) * d * pc, endFreq: 720 * pc, type: "triangle", gain: 0.28 * v, duration: 0.03 })
    tone({ freq: (145 + Math.random() * 20) * d * pc, endFreq: 65 * pc, type: "sine", gain: 0.42 * v, duration: 0.05 })
  },
  release() {
    burst({ freq: 3000 + Math.random() * 1000, type: "highpass", gain: 0.13, duration: 0.014 })
  },
  space() {
    /* carriage bell gated ~1 in 6 so it stays charming, not fatiguing;
       the mechanical thump lands every time */
    if (Math.random() < 1 / 6) {
      tone({ freq: 1318.5, type: "sine", gain: 0.22, duration: 0.42 })
      tone({ freq: 2637, type: "sine", gain: 0.07, duration: 0.3 })
    }
    tone({ freq: 110, endFreq: 50, type: "sine", gain: 0.54, duration: 0.09 })
    burst({ freq: 700, type: "lowpass", gain: 0.32, duration: 0.05 })
  },
}

const LINEAR = {
  verb: 0.15,
  key({ row = 2, col = 0 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.04
    const pc = colPitch({ col })
    burst({ freq: (480 + Math.random() * 140) * d * pc, type: "lowpass", gain: 0.44 * v, duration: 0.04 })
    tone({ freq: (128 + Math.random() * 20) * d * pc, endFreq: 62 * d * pc, type: "sine", gain: 0.5 * v, duration: 0.06 })
  },
  release() {
    burst({ freq: 900 + Math.random() * 300, type: "lowpass", gain: 0.15, duration: 0.02 })
    tone({ freq: 150 + Math.random() * 25, endFreq: 80, type: "sine", gain: 0.18, duration: 0.045 })
  },
  space() {
    tone({ freq: 96, endFreq: 44, type: "sine", gain: 0.6, duration: 0.1 })
    burst({ freq: 380, type: "lowpass", gain: 0.36, duration: 0.06 })
  },
}

/* crystalline glass taps with a bright ring */
const GLASS = {
  verb: 0.09,
  key({ row = 2, col = 0 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.03
    const pc = colPitch({ col })
    burst({ freq: (6200 + Math.random() * 1600) * d * pc, type: "highpass", gain: 0.13 * v, duration: 0.008 })
    tone({ freq: (1720 + Math.random() * 320) * d * pc, endFreq: (1180 + Math.random() * 140) * d * pc, type: "sine", gain: 0.34 * v, duration: 0.11 })
    tone({ freq: (2590 + Math.random() * 420) * d * pc, type: "sine", gain: 0.12 * v, duration: 0.055 })
    tone({ freq: (334 + Math.random() * 44) * d * pc, endFreq: 148 * pc, type: "triangle", gain: 0.14 * v, duration: 0.028 })
  },
  release() {
    burst({ freq: 5200 + Math.random() * 1400, type: "highpass", gain: 0.09, duration: 0.008 })
    tone({ freq: 1980 + Math.random() * 260, type: "sine", gain: 0.1, duration: 0.05 })
    tone({ freq: 180 + Math.random() * 30, endFreq: 95, type: "sine", gain: 0.14, duration: 0.05 })
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
  verb: 0.15,
  key({ row = 2, col = 0 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.045
    const pc = colPitch({ col })
    burst({ freq: (820 + Math.random() * 220) * d * pc, type: "bandpass", q: 1.4, gain: 0.5 * v, duration: 0.045 })
    tone({ freq: (196 + Math.random() * 26) * d * pc, endFreq: 88 * d * pc, type: "triangle", gain: 0.5 * v, duration: 0.07 })
    tone({ freq: (392 + Math.random() * 40) * d * pc, endFreq: 210 * pc, type: "sine", gain: 0.2 * v, duration: 0.04 })
    burst({ freq: (2400 + Math.random() * 500) * d * pc, type: "bandpass", q: 2.0, gain: 0.09 * v, duration: 0.012 })
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

/* deep premium 808-style thock — long low drop, woody body, soft definition */
const ABYSSAL = {
  verb: 0.24,
  key({ row = 2, col = 0 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.045
    const pc = colPitch({ col })
    tone({ freq: (90 + Math.random() * 12) * d * pc, endFreq: 45 * d * pc, type: "sine", gain: 0.68 * v, duration: 0.16 })
    burst({ freq: (500 + Math.random() * 80) * d * pc, type: "bandpass", q: 1.1, gain: 0.42 * v, duration: 0.07 })
    burst({ freq: (1400 + Math.random() * 400) * d * pc, type: "bandpass", q: 1.3, gain: 0.14 * v, duration: 0.018 })
    burst({ freq: (5600 + Math.random() * 1400) * d * pc, type: "highpass", gain: 0.09 * v, duration: 0.01 })
  },
  release() {
    tone({ freq: 120 + Math.random() * 20, endFreq: 65, type: "sine", gain: 0.22, duration: 0.045 })
    burst({ freq: 1600 + Math.random() * 500, type: "bandpass", q: 1.4, gain: 0.07, duration: 0.014 })
  },
  space() {
    tone({ freq: 70, endFreq: 32, type: "sine", gain: 0.78, duration: 0.22 })
    burst({ freq: 440, type: "bandpass", q: 1.2, gain: 0.4, duration: 0.08 })
    tone({ freq: 140, endFreq: 70, type: "sine", gain: 0.18, duration: 0.14, delay: 0.015 })
  },
}

/* ================= FLAGSHIP: marble — creamy deep thock =================
   designed from thock science: energy below 500Hz, tape-damped transient
   (lowpassed, never harsh), woody 280Hz body, sub-70Hz weight. Soft but
   solid — the utterly satisfying one. */

const MARBLE = {
  verb: 0.2,
  key({ row = 2, col = 0 } = {}) {
    const v = 0.85 + Math.random() * 0.3
    const d = 1 - row * 0.04
    const pc = colPitch({ col })
    /* tape-damped transient: soft knock, highs rolled off like foam + tape */
    burst({ freq: (2400 + Math.random() * 400) * d * pc, type: "lowpass", gain: 0.5 * v, duration: 0.02 })
    /* knuckle micro-click for definition */
    burst({ freq: (1200 + Math.random() * 200) * d * pc, type: "bandpass", q: 2.5, gain: 0.22 * v, duration: 0.012 })
    /* woody body resonance */
    burst({ freq: (280 + Math.random() * 40) * d * pc, type: "bandpass", q: 1.4, gain: 0.6 * v, duration: 0.07 })
    /* deep fundamental + sub weight */
    tone({ freq: (150 + Math.random() * 15) * d * pc, endFreq: 55 * d * pc, type: "sine", gain: 0.7 * v, duration: 0.11 })
    tone({ freq: (68 + Math.random() * 6) * d * pc, endFreq: 38 * d * pc, type: "sine", gain: 0.5 * v, duration: 0.13 })
  },
  release() {
    burst({ freq: 1100 + Math.random() * 300, type: "lowpass", gain: 0.12, duration: 0.016 })
    tone({ freq: 140 + Math.random() * 20, endFreq: 72, type: "sine", gain: 0.2, duration: 0.05 })
  },
  space() {
    tone({ freq: 95, endFreq: 34, type: "sine", gain: 0.78, duration: 0.16 })
    burst({ freq: 300, type: "bandpass", q: 1.3, gain: 0.44, duration: 0.075 })
    burst({ freq: 2300, type: "lowpass", gain: 0.16, duration: 0.018 })
    /* stabilizer rattle: two soft ticks chasing the thump */
    burst({ freq: 900, type: "lowpass", gain: 0.1, duration: 0.012 })
    tone({ freq: 120, endFreq: 70, type: "sine", gain: 0.22, duration: 0.06, delay: 0.012 })
  },
}

/* ================= PACK REGISTRY ================= */

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
  { id: "abyssal", name: "abyssal" },
  { id: "marble", name: "marble" },
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
  abyssal: ABYSSAL,
  marble: MARBLE,
}

export function setPack(id) {
  if (PACKS[id]) {
    packId = id
    currentVerbSend = PACKS[id].verb ?? 0.15
    if (verbSend) verbSend.gain.value = currentVerbSend
  }
}

/* ================= TRANSPORT: rhythm-aware hit dispatch ================= */

export function playKey(opts) {
  if (!audio()) return
  pan = (opts?.col ?? 0) * 0.24
  humanizeHit()
  PACKS[packId].key(opts)
}

export function playRelease() {
  if (!audio()) return
  pan = 0
  humanizeHit()
  PACKS[packId].release()
}

export function playSpace() {
  if (!audio()) return
  pan = 0
  humanizeHit()
  PACKS[packId].space()
}

/* ================= UI SOUNDS (neutral feel — melodies stay in tune) ================= */

export function playError() {
  if (!audio()) return
  pan = 0
  neutralizeHit()
  tone({ freq: 118, endFreq: 76, type: "triangle", gain: 0.3, duration: 0.085 })
  burst({ freq: 1900, type: "bandpass", q: 0.9, gain: 0.08, duration: 0.028 })
}

export function playFinish() {
  if (!audio()) return
  neutralizeHit()
  ;[523.25, 659.25, 783.99].forEach((f, i) =>
    tone({ freq: f, type: "triangle", gain: 0.3, duration: 0.34, delay: i * 0.09 })
  )
  tone({ freq: 1046.5, type: "sine", gain: 0.2, duration: 0.55, delay: 0.27 })
  tone({ freq: 391.99, type: "sine", gain: 0.14, duration: 0.6, delay: 0.27 })
}

/* final 3-second countdown tick */
export function playTick() {
  if (!audio()) return
  neutralizeHit()
  burst({ freq: 1800, type: "bandpass", q: 2, gain: 0.3, duration: 0.02 })
  tone({ freq: 940, endFreq: 720, type: "sine", gain: 0.24, duration: 0.045 })
}

/* streak milestone sparkle */
export function playMilestone() {
  if (!audio()) return
  neutralizeHit()
  tone({ freq: 880, type: "sine", gain: 0.18, duration: 0.12 })
  tone({ freq: 1318.51, type: "sine", gain: 0.16, duration: 0.16, delay: 0.08 })
}

/* bigger ascending run for personal records */
export function playRecord() {
  if (!audio()) return
  neutralizeHit()
  ;[659.25, 783.99, 987.77, 1318.51].forEach((f, i) =>
    tone({ freq: f, type: "triangle", gain: 0.26, duration: 0.22, delay: i * 0.07 })
  )
  tone({ freq: 1567.98, type: "sine", gain: 0.16, duration: 0.45, delay: 0.3 })
  tone({ freq: 391.99, type: "sine", gain: 0.12, duration: 0.55, delay: 0.3 })
}
