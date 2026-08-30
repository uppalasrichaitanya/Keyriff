import { useEffect, useRef, useState, memo } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { ROWS, targetsFor } from "../lib/keys"
import { playRelease } from "../lib/sound"
import { useFitScale } from "../hooks/useFitScale"

const DESIGN_W = 760
const DESIGN_H = 352


function Key({ k, isPressed, isGlow, isCapsLit, heatRatio }) {
  const state = isPressed
    ? "pressed"
    : k.code === "CapsLock" && isCapsLit
      ? "caps-lit"
      : isGlow
        ? "next"
        : ""
  return (
    <div
      className={`kb-key ${state}`}
      style={{ flexGrow: k.u ?? 1, flexBasis: 0 }}
    >
      <div className="kb-box">
        <div className="kb-top">
          {heatRatio != null && (
            <i
              className="kb-heat"
              style={{ "--heat-o": 0.25 + heatRatio * 0.75 }}
              aria-hidden
            />
          )}
          <span className={`kb-label ${k.label ? "" : "sr-only"}`}>
            {k.label}
          </span>
        </div>
        <i className="kb-wf" aria-hidden />
        <i className="kb-wl" aria-hidden />
        <i className="kb-wr" aria-hidden />
      </div>
    </div>
  )
}

function Keyboard({
  nextChar,
  capsLock,
  active,
  playing = false,
  externalPressed,
  compact = false,
  heatMap = null,
  errorTick = 0,
}) {
  const [pressed, setPressed] = useState(() => new Set())
  const timersRef = useRef(new Map())
  const reduceMotionRef = useRef(false)
  const playingRef = useRef(playing)
  playingRef.current = playing
  const frameRef = useRef(null)

  useEffect(() => {
    if (!errorTick || !frameRef.current) return
    const el = frameRef.current
    el.classList.add("error-flash")
    const t = setTimeout(() => el.classList.remove("error-flash"), 180)
    return () => clearTimeout(t)
  }, [errorTick])
  const tiltX = useMotionValue(0)
  const tiltY = useMotionValue(0)
  const springTiltX = useSpring(tiltX, { stiffness: 130, damping: 17 })
  const springTiltY = useSpring(tiltY, { stiffness: 130, damping: 17 })

  useEffect(() => {
    reduceMotionRef.current =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  }, [])

  function onMove(e) {
    if (reduceMotionRef.current) return
    const r = e.currentTarget.getBoundingClientRect()
    tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 10)
    tiltX.set(-((e.clientY - r.top) / r.height - 0.5) * 7)
  }

  function onLeave() {
    tiltX.set(0)
    tiltY.set(0)
  }

  function release(code) {
    const timer = timersRef.current.get(code)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(code)
    }
    setPressed((prev) => {
      if (!prev.has(code)) return prev
      const next = new Set(prev)
      next.delete(code)
      return next
    })
  }

  function press(code) {
    clearTimeout(timersRef.current.get(code))
    timersRef.current.set(
      code,
      setTimeout(() => release(code), 240)
    )
    setPressed((prev) => {
      if (prev.has(code)) return prev
      const next = new Set(prev)
      next.add(code)
      return next
    })
  }

  useEffect(() => {
    const isEditable = (e) => {
      const t = e.target
      return (
        t &&
        (t.tagName === "TEXTAREA" ||
          t.tagName === "INPUT" ||
          t.isContentEditable)
      )
    }
    const down = (e) => {
      if (e.repeat || isEditable(e)) return
      press(e.code)
    }
    const up = (e) => {
      release(e.code)
      if (!isEditable(e) && playingRef.current) playRelease()
    }
    const clearAll = () => {
      timersRef.current.forEach((t) => clearTimeout(t))
      timersRef.current.clear()
      setPressed(new Set())
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    window.addEventListener("blur", clearAll)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
      window.removeEventListener("blur", clearAll)
      clearAll()
    }
  }, [])

  const { codes: glowCodes, shift } = targetsFor(active ? nextChar : null)
  const glowSet = new Set(glowCodes)
  const allPressed =
    externalPressed && externalPressed.size > 0
      ? new Set([...pressed, ...externalPressed])
      : pressed

  const { ref: fitRef, scale } = useFitScale(DESIGN_W, DESIGN_H)

  return (
    <div
      ref={fitRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`select-none px-1 ${compact ? "" : "mt-10 pb-2 pt-3"}`}
    >
      <div
        className="flex justify-center overflow-hidden"
        style={{ height: DESIGN_H * scale }}
      >
        <div
          style={{
            width: DESIGN_W,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          <div className="kb-scene">
            <motion.div
              className="kb-parallax"
              style={{ rotateX: springTiltX, rotateY: springTiltY }}
            >
              <div className="kb-board">
              <div className="kb-frame" ref={frameRef}>
                <i className="kb-corner tl" aria-hidden />
                <i className="kb-corner br" aria-hidden />
                <i className="kb-frame-front" aria-hidden />
                <div className="kb-rows">
                  {ROWS.map((row, ri) => (
                    <div key={ri} className="kb-row">
                      {row.map((k) => (
                        <Key
                          key={k.code}
                          k={k}
                          isPressed={allPressed.has(k.code)}
                          isGlow={
                            glowSet.has(k.code) ||
                            (shift && k.code.startsWith("Shift"))
                          }
                          isCapsLit={k.code === "CapsLock" && capsLock}
                          heatRatio={heatMap ? (heatMap[k.code] ?? null) : null}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </motion.div>
          </div>
          <div className="kb-reflection" />
          <div className="kb-shadow" />
        </div>
      </div>
    </div>
  )
}

export default memo(Keyboard)
