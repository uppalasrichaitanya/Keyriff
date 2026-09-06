/* Captures README showcase GIFs via CDP screencast + in-Node pipeline.
   No ffmpeg needed: jpeg-js decodes frames, box-downsample shrinks them,
   gifenc encodes. Serves dist/ on preview (build first).
   Usage: node scripts/capture-showcase.cjs
   Output: docs/showcase/{hero,tour,boards}.gif (kept out of the PWA bundle). */
const { spawn } = require("node:child_process");
const { mkdirSync, writeFileSync } = require("node:fs");
const { join, dirname } = require("node:path");
const { fileURLToPath } = require("node:url");

const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "docs", "showcase");
const PORT = 5199;
const BASE = `http://localhost:${PORT}`;

const VW = 880;
const VH = 550;
const GW = 440;
const GH = 275;

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

  async function recordClip(url, seconds, fps = 7) {
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    await sleep(1800);
    const client = await page.createCDPSession();
    const frames = [];
    client.on("Page.screencastFrame", async ({ data, sessionId }) => {
      try {
        await client.send("Page.screencastFrameAck", { sessionId });
      } catch {}
      const buf = Buffer.from(data, "base64");
      const raw = jpeg.decode(buf, { maxMemoryUsageInMB: 512 });
      frames.push(downsample(raw, raw.width, raw.height));
    });
    await client.send("Page.startScreencast", {
      format: "jpeg",
      quality: 55,
      everyNthFrame: Math.max(1, Math.round(60 / fps)),
    });
    await sleep(seconds * 1000);
    try {
      await client.send("Page.stopScreencast");
    } catch {}
    await sleep(300);
    await client.detach().catch(() => {});
    return frames;
  }

  /* 2x box downsample 880x550 -> 440x275 (RGBA Buffer) */
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

  async function scene(name, clips) {
    let frames = [];
    for (const [url, secs] of clips) {
      frames = frames.concat(await recordClip(url, secs));
    }
    /* trim to ~6.5s at ~7fps for size discipline */
    const maxFrames = 46;
    let sampled = frames;
    if (frames.length > maxFrames) {
      const step = frames.length / maxFrames;
      sampled = Array.from({ length: maxFrames }, (_, i) => frames[Math.floor(i * step)]);
    }
    const bytes = encodeGif(sampled, Math.round(1000 / 7));
    writeFileSync(join(OUT, name), bytes);
    console.log(`wrote docs/showcase/${name} (${frames.length} frames -> ${sampled.length}, ${(bytes.length / 1024).toFixed(0)} KB)`);
  }

  const q = (theme, kb) => `${BASE}/?showcase&theme=${theme}&kb=${kb}`;
  await scene("hero.gif", [[q("ghost", "spectre"), 6]]);
  await scene("tour.gif", [
    [q("ghost", "spectre"), 2.2],
    [q("synthwave", "spectre"), 2.2],
    [q("sakura", "spectre"), 2.2],
  ]);
  await scene("boards.gif", [
    [q("midnight", "deck"), 2.2],
    [q("midnight", "monolith"), 2.2],
    [q("midnight", "halo"), 2.2],
  ]);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
