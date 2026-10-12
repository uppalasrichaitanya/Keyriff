import { useMemo } from "react"
import { analyzeWords, summarizeWords } from "../lib/wordStats"

function Row({ word, detail }) {
  return (
    <li className="flex items-baseline justify-between gap-4">
      <span className="truncate font-mono text-text">{word}</span>
      <span className="shrink-0 text-xs tabular-nums text-sub">{detail}</span>
    </li>
  )
}

/* the words that cost you the most this run — slowest per letter and the
   ones you fumbled — with a one-click drill on exactly those words */
export default function WordInsights({ result, onPractice }) {
  const summary = useMemo(
    () => summarizeWords(analyzeWords(result.events, result.words)),
    [result]
  )
  if (!summary) return null
  const { slowest, missed } = summary
  const drill = [...new Set([...missed, ...slowest].map((w) => w.word))]

  return (
    <div className="glass rounded-2xl border border-sub/15 bg-surface p-4 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-sub">
          worth practicing
        </span>
        {onPractice && drill.length > 0 && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPractice(drill)}
            className="rounded-md bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent transition-colors duration-150 hover:bg-accent/25"
          >
            drill these
          </button>
        )}
      </div>
      <div className="grid gap-x-10 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs text-sub">slowest</div>
          <ul className="flex flex-col gap-1">
            {slowest.map((w, i) => (
              <Row
                key={`${w.word}-${w.index}-${i}`}
                word={w.word}
                detail={`${Math.round(w.msPerChar)} ms/letter`}
              />
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-1 text-xs text-sub">most missed</div>
          {missed.length ? (
            <ul className="flex flex-col gap-1">
              {missed.map((w, i) => (
                <Row
                  key={`${w.word}-${w.index}-${i}`}
                  word={w.word}
                  detail={`${w.misses} mistake${w.misses === 1 ? "" : "s"}`}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sub">clean run — no mistakes</p>
          )}
        </div>
      </div>
    </div>
  )
}
