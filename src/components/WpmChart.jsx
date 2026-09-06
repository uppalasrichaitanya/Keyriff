import { motion } from "framer-motion"

const W = 820
const H = 250
const PAD_L = 46
const PAD_R = 18
const PAD_T = 16
const PAD_B = 30

export default function WpmChart({ history, pbWpm = null }) {
  if (!history || history.length < 2) {
    return (
      <div className="grid h-48 place-items-center text-sm text-sub">
        not enough data for a graph
      </div>
    )
  }

  const maxX = Math.max(...history.map((p) => p.t), 2)
  const maxY =
    Math.max(40, ...history.map((p) => Math.max(p.wpm, p.raw))) * 1.15

  const sx = (t) => PAD_L + ((W - PAD_L - PAD_R) * t) / maxX
  const sy = (v) => H - PAD_B - ((H - PAD_T - PAD_B) * v) / maxY

  const buildLine = (key) =>
    history
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${sx(p.t).toFixed(1)},${sy(p[key]).toFixed(1)}`
      )
      .join(" ")

  const wpmLine = buildLine("wpm")
  const rawLine = buildLine("raw")
  /* profit/loss coloring: split the wpm line into above/below-PB runs so
     beating your best reads accent and trailing reads muted */
  const wpmRuns = (() => {
    if (pbWpm == null || pbWpm <= 0) return [{ d: wpmLine, above: true }]
    const runs = []
    let cur = []
    let curAbove = null
    const flush = () => {
      if (cur.length > 1) runs.push({ d: cur.join(" "), above: curAbove })
      else if (cur.length === 1) runs.push({ d: cur.join(" "), above: curAbove })
    }
    history.forEach((p, i) => {
      const above = p.wpm >= pbWpm
      const seg = `${i === 0 || above !== curAbove ? "M" : "L"}${sx(p.t).toFixed(1)},${sy(p.wpm).toFixed(1)}`
      if (i > 0 && above !== curAbove) {
        /* bridge the crossing so runs stay continuous */
        cur.push(seg.replace(/^M/, "L"))
        flush()
        cur = [seg]
      } else {
        cur.push(seg)
      }
      curAbove = above
    })
    flush()
    return runs
  })()
  const areaPath = `${wpmLine} L${sx(history[history.length - 1].t).toFixed(1)},${H - PAD_B} L${PAD_L},${H - PAD_B} Z`

  const tickStep = Math.max(1, Math.ceil(maxX / 8 / 5) * 5)
  const xTicks = []
  for (let s = tickStep; s < maxX; s += tickStep) xTicks.push(s)
  const yStep = Math.max(10, Math.round(maxY / 4 / 10) * 10)
  const yTicks = []
  for (let v = yStep; v <= maxY; v += yStep) yTicks.push(v)

  const hasErrors = history.some((p) => p.err > 0)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full select-none"
      role="img"
      aria-label="wpm over time"
    >
      <defs>
        <linearGradient id="wpmFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={sy(v)}
            y2={sy(v)}
            stroke="var(--color-sub)"
            strokeOpacity="0.18"
            strokeDasharray="3 6"
          />
          <text x={PAD_L - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="var(--color-sub)">
            {v}
          </text>
        </g>
      ))}
      <line
        x1={PAD_L}
        x2={W - PAD_R}
        y1={H - PAD_B}
        y2={H - PAD_B}
        stroke="var(--color-sub)"
        strokeOpacity="0.35"
      />

      {xTicks.map((s) => (
        <text key={s} x={sx(s)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-sub)">
          {s}s
        </text>
      ))}

      <motion.path
        d={areaPath}
        fill="url(#wpmFill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.5 }}
      />

      <motion.path
        d={rawLine}
        fill="none"
        stroke="var(--color-sub)"
        strokeWidth="1.75"
        strokeDasharray="5 6"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: "easeInOut" }}
      />

      {wpmRuns.map((run, i) => (
        <motion.path
          key={i}
          d={run.d}
          fill="none"
          stroke={run.above ? "var(--color-accent)" : "var(--color-sub)"}
          strokeOpacity={run.above ? 1 : 0.75}
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={
            run.above
              ? {
                  filter:
                    "drop-shadow(0 0 6px color-mix(in srgb, var(--color-accent) 40%, transparent))",
                }
              : undefined
          }
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
      ))}

      {pbWpm != null && pbWpm > 0 && pbWpm < maxY && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={sy(pbWpm)}
            y2={sy(pbWpm)}
            stroke="var(--color-sub)"
            strokeOpacity="0.55"
            strokeDasharray="2 6"
          />
          <text
            x={W - PAD_R - 2}
            y={sy(pbWpm) - 5}
            textAnchor="end"
            fontSize="10"
            fill="var(--color-sub)"
          >
            pb {Math.round(pbWpm)}
          </text>
        </motion.g>
      )}

      {hasErrors &&
        history
          .filter((p) => p.err > 0)
          .map((p) => (            <motion.g
              key={p.t}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.25 }}
            >
              <path
                d={`M${sx(p.t) - 4},${sy(p.wpm) - 4} l8,8 M${sx(p.t) + 4},${
                  sy(p.wpm) - 4
                } l-8,8`}
                stroke="var(--color-error)"
                strokeWidth="2.25"
                strokeLinecap="round"
              >
                <title>{`${p.err} error${p.err > 1 ? "s" : ""} at ${p.t}s`}</title>
              </path>
            </motion.g>
          ))}

      {history.map((p) => (
        <circle key={`hover-${p.t}`} cx={sx(p.t)} cy={sy(p.wpm)} r="10" fill="transparent">
          <title>{`${p.t}s — ${p.wpm} wpm (${p.raw} raw)`}</title>
        </circle>
      ))}
    </svg>
  )
}
