import { describe, test, expect, beforeEach, vi } from "vitest"
import { act, render, screen, fireEvent } from "@testing-library/react"
import App from "../src/App.jsx"

// jsdom cannot run framer-motion's exit animations, which makes
// <AnimatePresence mode="wait"> never release the outgoing screen.
// Swap children synchronously; animation timing is not under test here.
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion")
  return {
    ...actual,
    AnimatePresence: ({ children }) => children ?? null,
  }
})

// jsdom does not implement the Web Animations API; TypingTest calls
// el.animate() for shake/pulse effects and ignores the returned object.
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = function animate() {
    return { cancel() {}, finished: Promise.resolve() }
  }
}

const BASE_SETTINGS = {
  mode: "time",
  timeValue: 30,
  wordValue: 25,
  punctuation: false,
  numbers: false,
  sound: false,
  volume: 85,
  pack: "tactile",
  customText: "",
  showHeat: false,
  forceCorrect: false,
  wordLength: "any",
  fontSize: "m",
}

const WORDS3 = { ...BASE_SETTINGS, mode: "words", wordValue: 3 }

function seed(settings) {
  localStorage.setItem("typer:v2:settings", JSON.stringify(settings))
  localStorage.setItem("typer:v2:theme", JSON.stringify("serika"))
}

// The engine listens for window keydown and ignores events from
// textarea/input/contentEditable targets, so dispatching on document.body
// drives a real test.
function typeText(text) {
  return act(async () => {
    for (const ch of text) {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: ch,
          bubbles: true,
          cancelable: true,
        })
      )
    }
  })
}

function testWords() {
  return [...document.querySelectorAll('[data-ci="0"]')].map(
    (el) => el.parentElement.textContent
  )
}

describe("App", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test("renders the test screen with words", () => {
    seed(BASE_SETTINGS)
    render(<App />)
    expect(document.querySelectorAll('[data-ci="0"]').length).toBeGreaterThan(20)
  })

  test("marks a correct character", async () => {
    seed(WORDS3)
    render(<App />)
    const w = testWords()[0]
    expect(w.length).toBeGreaterThan(0)
    await typeText(w[0])
    expect(document.querySelector('[data-ci="0"] span')).toHaveClass("text-text")
  })

  test("marks an incorrect character", async () => {
    seed(WORDS3)
    render(<App />)
    const w = testWords()[0]
    const wrong = w[0] === "q" ? "r" : "q"
    await typeText(wrong)
    expect(document.querySelector('[data-ci="0"] span')).toHaveClass("text-error")
  })

  test("finishes a words-mode test and shows results", async () => {
    seed(WORDS3)
    render(<App />)
    const [w1, w2, w3] = testWords()
    await typeText(`${w1} ${w2} ${w3} `)
    await screen.findByText("results", {}, { timeout: 4000 })
  })

  test("regenerates words when a setting changes", () => {
    seed(BASE_SETTINGS)
    render(<App />)
    const before = testWords()[0]
    fireEvent.click(screen.getByRole("button", { name: "numbers" }))
    const after = testWords()[0]
    expect(document.querySelectorAll('[data-ci="0"]').length).toBeGreaterThan(20)
    expect(after).not.toBe(before)
  })
})
