import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import gifenc from 'gifenc'
import { PNG } from 'pngjs'
import {
  CAPSULE_GIF_FPS,
  CAPSULE_GIF_FRAME_MS,
  CAPSULE_GIF_LOOP_MS,
  CAPSULE_GIF_VIEWPORT,
  CAPSULE_TYPES,
  type CapsuleType,
} from '../src/lib/capsule-art.ts'

const { GIFEncoder, quantize, applyPalette } = gifenc

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PUBLIC_DIR = path.join(ROOT, 'public')
const PORT = Number(process.env.CAPSULE_RENDER_PORT ?? 3000)
const BASE_URL = `http://127.0.0.1:${PORT}`

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer(url: string, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // keep polling
    }
    await sleep(500)
  }
  throw new Error(`Timed out waiting for dev server at ${url}`)
}

function startDevServer(): ChildProcess {
  return spawn('pnpm', ['dev', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  })
}

type RgbaFrame = { data: Uint8Array; width: number; height: number }

function pngBufferToRgba(buffer: Buffer): RgbaFrame {
  const png = PNG.sync.read(buffer)
  return { data: png.data, width: png.width, height: png.height }
}

function resolveTransparentIndex(palette: number[][]) {
  let transparentIndex = palette.findIndex((color) => (color[3] ?? 255) === 0)
  if (transparentIndex >= 0) return transparentIndex

  palette.unshift([0, 0, 0, 0])
  if (palette.length > 256) palette.pop()
  return 0
}

function encodeGif(frames: RgbaFrame[]) {
  const width = frames[0]!.width
  const height = frames[0]!.height
  const combined = new Uint8Array(width * height * frames.length * 4)

  for (let i = 0; i < frames.length; i += 1) {
    combined.set(frames[i]!.data, i * frames[i]!.data.length)
  }

  const palette = quantize(combined, 256, { format: 'rgba4444' })
  const transparentIndex = resolveTransparentIndex(palette)
  const gif = GIFEncoder()

  frames.forEach((frame, index) => {
    const indices = applyPalette(frame.data, palette, 'rgba4444')
    gif.writeFrame(indices, width, height, {
      palette,
      delay: CAPSULE_GIF_FRAME_MS,
      transparent: true,
      transparentIndex,
      repeat: index === 0 ? 0 : undefined,
    })
  })

  gif.finish()
  return Buffer.from(gif.bytes())
}

async function captureCapsuleGif(type: CapsuleType) {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: CAPSULE_GIF_VIEWPORT,
    deviceScaleFactor: 2,
  })

  try {
    await page.goto(`${BASE_URL}/render-capsules.html?type=${type}`, {
      waitUntil: 'networkidle',
    })
    await page.waitForSelector('[data-capsule-gif-root]')
    await page.evaluate(async () => {
      await document.fonts.load('1.875rem "Press Start 2P"')
      await document.fonts.ready
    })
    await page.waitForSelector('html[data-gif-loop-ready="true"]')

    const handle = await page.locator('[data-capsule-gif-root]').elementHandle()
    if (!handle) throw new Error(`Missing render root for ${type}`)

    const frameCount = Math.round((CAPSULE_GIF_LOOP_MS / 1000) * CAPSULE_GIF_FPS)
    const rgbaFrames: RgbaFrame[] = []
    const captureStart = Date.now()

    for (let i = 0; i < frameCount; i += 1) {
      const targetMs = i * CAPSULE_GIF_FRAME_MS
      const elapsed = Date.now() - captureStart
      if (targetMs > elapsed) {
        await sleep(targetMs - elapsed)
      }

      const shot = await handle.screenshot({ type: 'png', omitBackground: true })
      rgbaFrames.push(pngBufferToRgba(shot))
    }

    const gif = encodeGif(rgbaFrames)
    const outPath = path.join(PUBLIC_DIR, `${type}.gif`)
    fs.writeFileSync(outPath, gif)
    console.log(
      `Wrote ${outPath} (${rgbaFrames[0]!.width}x${rgbaFrames[0]!.height}, ${frameCount} frames @ ${CAPSULE_GIF_FPS}fps, transparent)`,
    )
  } finally {
    await browser.close()
  }
}

async function main() {
  const only = process.argv.slice(2).filter(Boolean) as CapsuleType[]
  const types = only.length > 0 ? only : CAPSULE_TYPES

  let dev: ChildProcess | null = null
  let startedHere = false

  try {
    try {
      await waitForServer(`${BASE_URL}/`, 2_000)
    } catch {
      startedHere = true
      dev = startDevServer()
      await waitForServer(`${BASE_URL}/`)
    }

    for (const type of types) {
      await captureCapsuleGif(type)
    }
  } finally {
    if (startedHere && dev) {
      dev.kill('SIGTERM')
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
