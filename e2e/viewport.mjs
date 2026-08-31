import { execSync, spawn } from "node:child_process"
import { mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const SHOTS = path.join(__dirname, "shots")
const PORT = 5199
const BASE_URL = `http://localhost:${PORT}`
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.error("[e2e]", ...a)

/* 1. build */
log("building (npm run build)...")
try {
  execSync("npm run build", { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] })
  log("build ok")
} catch (e) {
  process.stdout.write(e.stdout?.toString() ?? "")
  process.stderr.write(e.stderr?.toString() ?? "")
  log("BUILD FAILED")
  process.exit(1)
}

/* free port 5199 (kill stray vite/node holding it) */
try {
  execSync(
    `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
    { stdio: "ignore" }
  )
} catch {}
await sleep(600)

/* 2. start preview server */
const server = spawn(
  "node",
  [
    path.join("node_modules", "vite", "bin", "vite.js"),
    "preview",
    "--port",
    String(PORT),
    "--strictPort=false",
  ],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
)
server.stdout?.on?.("data", (d) => log("vite:", String(d).trim()))
server.stderr?.on?.("data", (d) => log("vite:", String(d).trim()))
server.on("exit", (code) => log(`vite exited early (code ${code})`))

let serverUp = false
for (let i = 0; i < 60; i++) {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(2000) })
    if (res.status === 200) {
      serverUp = true
      break
    }
  } catch {}
  await sleep(500)
}
if (!serverUp) {
  log(`preview server did not answer 200 on ${BASE_URL} within 30s`)
  try {
    server.kill()
  } catch {}
  process.exit(1)
}
log(`preview server up at ${BASE_URL}`)

/* 3. launch headless Chrome */
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
})

mkdirSync(SHOTS, { recursive: true })

const viewports = [
  { name: "phone", w: 360, h: 740 },
  { name: "tablet", w: 768, h: 1024 },
  { name: "desktop", w: 1280, h: 800 },
]

const results = []
let failed = false

try {
  for (const vp of viewports) {
    log(`--- viewport: ${vp.name} (${vp.w}x${vp.h}) ---`)
    const page = await browser.newPage()
    const errors = []
    page.on("pageerror", (errObj) => {
      const text = String(errObj?.message ?? errObj)
      if (/favicon|404/i.test(text)) return
      errors.push(`pageerror: ${text}`)
    })
    page.on("console", (msg) => {
      if (msg.type() !== "error") return
      const text = msg.text()
      if (/favicon|404/i.test(text)) return
      errors.push(`console: ${text}`)
    })

    await page.setViewport({
      width: vp.w,
      height: vp.h,
      isMobile: vp.name === "phone",
      hasTouch: vp.name === "phone",
    })
    await page.goto(BASE_URL, { waitUntil: "networkidle0", timeout: 30000 })
    await sleep(1500)
    await page.keyboard.type("the", { delay: 70 })
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    )

    /* programmatic visual QA */
    const qa = await page.evaluate(() => {
      const out = {}
      const scene = document.querySelector(".kb-scene")
      const scaled = scene?.parentElement
      if (scaled) {
        const m = new DOMMatrixReadOnly(getComputedStyle(scaled).transform)
        out.kbScale = Math.round(m.a * 1000) / 1000
        const r = scaled.getBoundingClientRect()
        out.kbFits = r.width <= window.innerWidth + 1
      }
      const big = document.querySelector("span.tabular-nums")
      out.bigNumberPx = big ? getComputedStyle(big).fontSize : null
      out.grain = !!document.querySelector(".grain")
      out.ambient = !!document.querySelector(".bgfx .motes")
      out.scheme = document.documentElement.dataset.scheme
      const vig = document.querySelector(".vignette")
      out.vignetteBg = vig ? getComputedStyle(vig).backgroundImage : null
      return out
    })

    await page.screenshot({ path: path.join(SHOTS, `${vp.name}-test.png`) })
    await page.click('[aria-label*="open stats"]')
    await sleep(800)
    await page.screenshot({ path: path.join(SHOTS, `${vp.name}-stats.png`) })

    if (vp.name === "desktop") {
      await page.evaluate(() =>
        localStorage.setItem("typer:v2:theme", JSON.stringify("porcelain"))
      )
      await page.reload({ waitUntil: "networkidle0", timeout: 30000 })
      await sleep(1500)
      await page.keyboard.type("abc", { delay: 70 })
      const light = await page.evaluate(() => {
        const vig = document.querySelector(".vignette")
        return {
          scheme: document.documentElement.dataset.scheme,
          vignetteBg: vig ? getComputedStyle(vig).backgroundImage : null,
        }
      })
      qa.light = light
      await page.screenshot({ path: path.join(SHOTS, "desktop-light.png") })

      /* keyboard styles + flair themes */
      for (const style of [
        "solid", "retro", "terminal", "low", "gummy",
        "neon", "chrome", "ice", "artisan",
      ]) {
        await page.evaluate((s) => {
          localStorage.setItem(
            "typer:v2:settings",
            JSON.stringify({
              mode: "time", timeValue: 30, wordValue: 25,
              punctuation: false, numbers: false, sound: false,
              volume: 85, pack: "tactile", customText: "",
              showHeat: false, forceCorrect: false,
              wordLength: "any", fontSize: "m",
              suddenDeath: false, kbStyle: s,
            })
          )
        }, style)
        await page.reload({ waitUntil: "networkidle0", timeout: 30000 })
        await sleep(900)
        const kbAttr = await page.evaluate(
          () => document.documentElement.dataset.kb
        )
        await page.screenshot({ path: path.join(SHOTS, `desktop-kb-${style}.png`) })
        qa[`kb_${style}`] = kbAttr
      }
      for (const theme of ["starlight", "vaporgrid", "matrix", "sakura", "abyss"]) {
        await page.evaluate((t) => {
          localStorage.setItem("typer:v2:theme", JSON.stringify(t))
        }, theme)
        await page.reload({ waitUntil: "networkidle0", timeout: 30000 })
        await sleep(1200)
        const flair = await page.evaluate(() => {
          const el = document.querySelector("[class*='flair-']")
          return el ? el.className.split(" ")[0] : null
        })
        await page.screenshot({ path: path.join(SHOTS, `desktop-${theme}.png`) })
        qa[`flair_${theme}`] = flair
      }
    }

    log(`${vp.name}: overflow=${over}, qa=${JSON.stringify(qa)}, errors=${errors.length}`)
    results.push({ name: vp.name, horizontalOverflow: over, qa, errors })
    await page.close()
  }
} catch (e) {
  failed = true
  log("test run failed:", e)
} finally {
  try {
    server.kill()
  } catch {}
  try {
    await browser.close()
  } catch {}
}

const report = { viewports: results }
console.log(JSON.stringify(report, null, 2))
const qaFailed = results.some((v) => {
  if (!v.qa) return false
  if (!v.qa.kbFits) return true
  if (!v.qa.ambient) return true
  if (v.name === "phone" && !(v.qa.kbScale < 1)) return true
  if (v.name === "phone" && v.qa.bigNumberPx !== "36px") return true
  if (v.name !== "phone" && v.qa.bigNumberPx !== "48px") return true
  return false
})
const lightFailed = results.some(
  (v) =>
    v.qa?.light &&
    (v.qa.light.scheme !== "light" || v.qa.light.vignetteBg !== "none")
)
const styleFailed = results.some((v) => {
  if (!v.qa) return false
  for (const style of [
    "solid", "retro", "terminal", "low", "gummy",
    "neon", "chrome", "ice", "artisan",
  ]) {
    if (v.qa[`kb_${style}`] !== style) return true
  }
  if (v.qa.flair_starlight !== "flair-stars") return true
  if (v.qa.flair_vaporgrid !== "flair-grid") return true
  if (v.qa.flair_matrix !== "flair-rain") return true
  if (v.qa.flair_sakura !== "flair-petals") return true
  if (v.qa.flair_abyss !== "flair-bubbles") return true
  return false
})
failed =
  failed ||
  qaFailed ||
  lightFailed ||
  styleFailed ||
  results.some((v) => v.horizontalOverflow > 1 || v.errors.length > 0)
process.exitCode = failed ? 1 : 0
