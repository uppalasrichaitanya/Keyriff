import { useMemo } from "react"

const W = 800
const H = 220
const PAD_L = 44
const PAD_R = 16
const PAD_T = 18
const PAD_B = 26

export default function ProgressChart({ data }) {
  const { path, area, points, yTicks, maxW } = useMemo(() => {
    const wpm = data.map((r) => r.wpm)
    const maxY = Math.max(40, ...wpm) * 1.15
    const n = Math.max(1, data.length - 1)
    const pts = data.map((r, i) => ({
      x: PAD_L + (i / n) * (W - PAD_L - PAD_R),
      y: H - PAD_B - (r.wpm / maxY) * (H - PAD_T - PAD_B),
      r,
    }))
    let p = ""
    pts.forEach((pt, i) => {
      p += `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)} `
    })
    const a =
      pts.length > 1
        ? `${p} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD_B} L${PAD_L},${H - PAD_B} Z`
        : ""
    const ticks = []
    const step = Math.max(10, Math.round(maxY / 4 / 10) * 10)
    for (let v = step; v <= maxY; v += step) ticks.push(v)
    return { path: p.trim(), area: a, points: pts, yTicks: ticks, maxW: maxY }
  }, [data])

  if (!data || data.length < 2) {
    return (
      <div className="grid h-48 place-items-center text-sm text-sub">
        complete at least two tests to see your progression
      </div>
    )
  }

  const last = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full select-none"
      role="img"
      aria-label="wpm progression"
    >
      <defs>
        <linearGradient id="progFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.24" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={H - PAD_B - (v / maxW) * (H - PAD_T - PAD_B)}
            y2={H - PAD_B - (v / maxW) * (H - PAD_T - PAD_B)}
            stroke="var(--color-sub)"
            strokeOpacity="0.15"
            strokeDasharray="3 6"
          />
          <text
            x={PAD_L - 8}
            y={H - PAD_B - (v / maxW) * (H - PAD_T - PAD_B) + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--color-sub)"
          >
            {v}
          </text>
        </g>
      ))}

      <path d={area} fill="url(#progFill)" />

      <path
        d={path}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter:
            "drop-shadow(0 0 5px color-mix(in srgb, var(--color-accent) 35%, transparent))",
        }}
      />

      {points.map((pt, i) => (
        <g key={i}>
          <circle
            cx={pt.x}
            cy={pt.y}
            r={i === points.length - 1 ? 4 : 3}
            fill={
              i === points.length - 1
                ? "var(--color-accent)"
                : "color-mix(in srgb, var(--color-text) 55%, transparent)"
            }
          >
            <title>{`${Math.round(pt.r.wpm)} wpm · ${pt.r.modeLabel}`}</title>
          </circle>
          <circle cx={pt.x} cy={pt.y} r="11" fill="transparent">
            <title>{`${Math.round(pt.r.wpm)} wpm · ${pt.r.modeLabel}`}</title>
          </circle>
        </g>
      ))}

      <circle cx={last.x} cy={last.y} r="7" fill="none" stroke="var(--color-accent)" strokeOpacity="0.4" />
    </svg>
  )
}
