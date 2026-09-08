/* Captures README showcase GIFs via CDP screencast + in-Node pipeline.
   No ffmpeg needed: jpeg-js decodes frames, box-downsample shrinks them,
   gifenc encodes. Serves dist/ on preview (build first).
   Usage: node scripts/capture-showcase.cjs
   Output: docs/showcase/{hero,tour,boards}.gif (kept out of the PWA bundle). */
const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "docs", "showcase");
const PORT = 5199;
const BASE = `http://localhost:${PORT}`;

const VW = 880;
const VH = 620;
const GW = 440;
const GH = 310;
const ZOOM = 0.8;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const puppeteer = (await import("puppeteer-core")).default;
  const jpeg = require("jpeg-js");
  const { GIFEncoder, quantize, applyPalette } = require("gifenc");

  mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=1"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH });
  /* seed showcase delights before any app script runs: block caret +
     a mode PB so the ghost caret replays behind the live caret */
  await page.evaluateOnNewDocument(() => {
    try {
      const raw = localStorage.getItem("typer:v2:settings");
      const s = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        "typer:v2:settings",
        JSON.stringify({
          mode: "time", timeValue: 30, wordValue: 25,
          punctuation: false, numbers: false, wordLength: "any",
          fontSize: "m", sound: false, volume: 85, pack: "tactile",
          showHeat: false, forceCorrect: false, suddenDeath: false,
          customText: "", ...s, caretStyle: "block",
        })
      );
      const pbs = JSON.parse(localStorage.getItem("typer:v2:pbs") ?? "{}");
      if (!pbs["time-30"] || !(pbs["time-30"].wpm > 0)) {
        pbs["time-30"] = { wpm: 82, acc: 97 };
        localStorage.setItem("typer:v2:pbs", JSON.stringify(pbs));
      }
      localStorage.setItem("typer:v2:seen-intro", "true");
    } catch {}
  });

  async function recordClip(url, seconds, fps = 9) {
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    /* 80% zoom pulls the full keyboard into frame at 880x620
       (probe: kb bottom 695 cropped at 100%, 557 fits at 80%) */
    await page.evaluate((z) => { document.body.style.zoom = String(z); }, ZOOM);
    await sleep(1800);
    const client = await page.createCDPSession();
    const rawFrames = [];
    /* ack + stash only: jpeg decode + downsample (~150-250ms/frame in
       pure JS) on the hot path back-pressures the compositor to ~4fps.
       Stashing base64 buffers is ~2ms, so Chrome sustains the full ~8.5fps
       source rate; the expensive decode happens after stopScreencast. */
    client.on("Page.screencastFrame", ({ data, sessionId }) => {
      client.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
      rawFrames.push(Buffer.from(data, "base64"));
    });
    await client.send("Page.startScreencast", {
      /* quality 40: software JPEG encode is the emission bottleneck
         (q55 capped us at ~4fps); after 2x downsample + 128-color GIF
         quantize, q40 source is visually indistinguishable. */
      format: "jpeg",
      quality: 40,
      everyNthFrame: Math.max(1, Math.round(60 / fps)),
    });
    await sleep(seconds * 1000);
    try {
      await client.send("Page.stopScreencast");
    } catch {}
    await sleep(300);
    await client.detach().catch(() => {});
    const frames = rawFrames.map((buf) => {
      const raw = jpeg.decode(buf, { maxMemoryUsageInMB: 512 });
      return downsample(raw, raw.width, raw.height);
    });
    return frames;
  }

  /* 2x box downsample 880x620 -> 440x310 (RGBA Buffer) */
  function downsample(raw, w, h) {
    const sx = Math.round(w / GW);
    const sy = Math.round(h / GH);
    const out = Buffer.alloc(GW * GH * 4);
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = 0; dy < sy; dy++) {
          for (let dx = 0; dx < sx; dx++) {
            const ix = Math.min(w - 1, x * sx + dx);
            const iy = Math.min(h - 1, y * sy + dy);
            const o = (iy * w + ix) * 4;
            r += raw.data[o]; g += raw.data[o + 1]; b += raw.data[o + 2]; n++;
          }
        }
        const o = (y * GW + x) * 4;
        out[o] = Math.round(r / n);
        out[o + 1] = Math.round(g / n);
        out[o + 2] = Math.round(b / n);
        out[o + 3] = 255;
      }
    }
    return out;
  }

  function encodeGif(frames, delayMs) {
    const gif = new GIFEncoder();
    const quantOpts = { format: "rgba4444", clearAlpha: false, clearAlphaThreshold: 0, clearAlphaColor: 0 };
    for (const f of frames) {
      const palette = quantize(f, 128, quantOpts);
      const index = applyPalette(f, palette, "rgba4444");
      gif.writeFrame(index, GW, GH, { palette, delay: delayMs });
    }
    gif.finish();
    return Buffer.from(gif.bytes());
  }

  async function scene(name, clips, maxFrames = 48) {
    let frames = [];
    let wallSecs = 0;
    for (const [url, secs] of clips) {
      frames = frames.concat(await recordClip(url, secs));
      wallSecs += secs;
    }
    /* trim for size discipline (stays <1MB each) */
    let sampled = frames;
    if (frames.length > maxFrames) {
      const step = frames.length / maxFrames;
      sampled = Array.from({ length: maxFrames }, (_, i) => frames[Math.floor(i * step)]);
    }
    /* real-time pacing: delay matches the measured source rate, so the GIF
       plays at 1x speed even when headless compositing runs slower than 9fps.
       (A typing screen is mostly static between keystrokes, so 4-8fps source
       paced in real time reads as smooth, never fast-forward.) */
    const delay = Math.max(20, Math.round((wallSecs * 1000) / sampled.length));
    const bytes = encodeGif(sampled, delay);
    writeFileSync(join(OUT, name), bytes);
    console.log(`wrote docs/showcase/${name} (${frames.length} frames -> ${sampled.length}, ${delay}ms delay, ${(bytes.length / 1024).toFixed(0)} KB)`);
  }

  const q = (theme, kb) => `${BASE}/?showcase&theme=${theme}&kb=${kb}`;
  /* optional argv filter: `node scripts/capture-showcase.cjs boards`
     recaptures a single scene (used to retry a contended run) */
  const only = (process.argv[2] || "").replace(/\.gif$/, "");
  if (!only || only === "hero") await scene("hero.gif", [[q("ghost", "spectre"), 6]], 48);
  if (!only || only === "tour") await scene("tour.gif", [
    [q("ghost", "spectre"), 2.2],
    [q("synthwave", "spectre"), 2.2],
    [q("sakura", "spectre"), 2.2],
  ], 48);
  if (!only || only === "boards") await scene("boards.gif", [
    [q("midnight", "deck"), 3.5],
    [q("midnight", "monolith"), 3.5],
    [q("midnight", "halo"), 3.5],
  ], 42);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
