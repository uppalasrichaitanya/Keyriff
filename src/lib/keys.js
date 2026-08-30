const SHIFT_MAP = {
  "!": "Digit1", "@": "Digit2", "#": "Digit3", "$": "Digit4",
  "%": "Digit5", "^": "Digit6", "&": "Digit7", "*": "Digit8",
  "(": "Digit9", ")": "Digit0", "_": "Minus", "+": "Equal",
  "~": "Backquote", "{": "BracketLeft", "}": "BracketRight",
  "|": "Backslash", ":": "Semicolon", '"': "Quote",
  "<": "Comma", ">": "Period", "?": "Slash",
}

const DIRECT_MAP = {
  "-": "Minus", "=": "Equal", "[": "BracketLeft", "]": "BracketRight",
  "\\": "Backslash", ";": "Semicolon", "'": "Quote", ",": "Comma",
  ".": "Period", "/": "Slash", "`": "Backquote",
}

export function targetsFor(ch) {
  if (!ch) return { codes: [], shift: false }
  if (ch === " ") return { codes: ["Space"], shift: false }
  if (/[a-z]/.test(ch)) return { codes: [`Key${ch.toUpperCase()}`], shift: false }
  if (/[A-Z]/.test(ch)) return { codes: [`Key${ch}`], shift: true }
  if (/[0-9]/.test(ch)) return { codes: [`Digit${ch}`], shift: false }
  if (SHIFT_MAP[ch]) return { codes: [SHIFT_MAP[ch]], shift: true }
  if (DIRECT_MAP[ch]) return { codes: [DIRECT_MAP[ch]], shift: false }
  return { codes: [], shift: false }
}

const CODE_LABELS = {
  Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]",
  Backslash: "\\", Semicolon: ";", Quote: "'", Comma: ",",
  Period: ".", Slash: "/", Backquote: "`", Space: "space",
}

export function codeLabel(code) {
  if (CODE_LABELS[code]) return CODE_LABELS[code]
  if (code.startsWith("Key")) return code.slice(3).toLowerCase()
  if (code.startsWith("Digit")) return code.slice(5)
  return code.toLowerCase()
}

export function charForCode(code) {
  if (code === "Space") return " "
  if (code.startsWith("Key")) return code.slice(3).toLowerCase()
  if (code.startsWith("Digit")) return code.slice(5)
  const l = CODE_LABELS[code]
  return l && l !== "space" ? l : null
}

/* physical layout — shared by the visual keyboard and sound engine */
export const ROWS = [
  [
    { code: "Backquote", label: "`" },
    { code: "Digit1", label: "1" },
    { code: "Digit2", label: "2" },
    { code: "Digit3", label: "3" },
    { code: "Digit4", label: "4" },
    { code: "Digit5", label: "5" },
    { code: "Digit6", label: "6" },
    { code: "Digit7", label: "7" },
    { code: "Digit8", label: "8" },
    { code: "Digit9", label: "9" },
    { code: "Digit0", label: "0" },
    { code: "Minus", label: "-" },
    { code: "Equal", label: "=" },
    { code: "Backspace", label: "back", u: 2 },
  ],
  [
    { code: "Tab", label: "tab", u: 1.5 },
    { code: "KeyQ", label: "q" },
    { code: "KeyW", label: "w" },
    { code: "KeyE", label: "e" },
    { code: "KeyR", label: "r" },
    { code: "KeyT", label: "t" },
    { code: "KeyY", label: "y" },
    { code: "KeyU", label: "u" },
    { code: "KeyI", label: "i" },
    { code: "KeyO", label: "o" },
    { code: "KeyP", label: "p" },
    { code: "BracketLeft", label: "[" },
    { code: "BracketRight", label: "]" },
    { code: "Backslash", label: "\\", u: 1.5 },
  ],
  [
    { code: "CapsLock", label: "caps", u: 1.75 },
    { code: "KeyA", label: "a" },
    { code: "KeyS", label: "s" },
    { code: "KeyD", label: "d" },
    { code: "KeyF", label: "f" },
    { code: "KeyG", label: "g" },
    { code: "KeyH", label: "h" },
    { code: "KeyJ", label: "j" },
    { code: "KeyK", label: "k" },
    { code: "KeyL", label: "l" },
    { code: "Semicolon", label: ";" },
    { code: "Quote", label: "'" },
    { code: "Enter", label: "enter", u: 2.25 },
  ],
  [
    { code: "ShiftLeft", label: "shift", u: 2.25 },
    { code: "KeyZ", label: "z" },
    { code: "KeyX", label: "x" },
    { code: "KeyC", label: "c" },
    { code: "KeyV", label: "v" },
    { code: "KeyB", label: "b" },
    { code: "KeyN", label: "n" },
    { code: "KeyM", label: "m" },
    { code: "Comma", label: "," },
    { code: "Period", label: "." },
    { code: "Slash", label: "/" },
    { code: "ShiftRight", label: "shift", u: 2.75 },
  ],
  [
    { code: "ControlLeft", label: "ctrl", u: 1.5 },
    { code: "MetaLeft", label: "win", u: 1.25 },
    { code: "AltLeft", label: "alt", u: 1.25 },
    { code: "Space", label: "", u: 6.25 },
    { code: "AltRight", label: "alt", u: 1.25 },
    { code: "MetaRight", label: "fn", u: 1.25 },
    { code: "ContextMenu", label: "menu", u: 1.25 },
    { code: "ControlRight", label: "ctrl", u: 1.5 },
  ],
]

/* which physical row (0 = number row … 4 = bottom) a character lives on */
export function rowOfChar(ch) {
  if (!ch) return 2
  const { codes } = targetsFor(ch)
  const code = codes[0]
  if (!code) return 2
  for (let r = 0; r < ROWS.length; r++) {
    if (ROWS[r].some((k) => k.code === code)) return r
  }
  return 2
}
