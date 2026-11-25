// Gera favicons, ícones PWA e variantes de UI a partir de public/favicon.svg (fonte vetorial).
// Uso: node scripts/gerar-logo-assets.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SRC_SVG = resolve(ROOT, 'public/favicon.svg')
const BADGE_BLUE = '#4371C2'

const svg = readFileSync(SRC_SVG, 'utf8')
const viewBoxMatch = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
if (!viewBoxMatch) throw new Error('viewBox não encontrado em ' + SRC_SVG)
const w = parseFloat(viewBoxMatch[1])
const h = parseFloat(viewBoxMatch[2])
const side = Math.max(w, h)
const padX = (side - w) / 2
const padY = (side - h) / 2

const inner = svg.replace(/^[\s\S]*?<g>/, '').replace(/<\/g>\s*<\/svg>\s*$/, '')

// Canvas quadrado: só estende o eixo menor (sem pintar fundo), fora do emblema
// arredondado fica transparente.
const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}">
<g transform="translate(${padX},${padY})">${inner}</g>
</svg>`

async function renderSquare(size) {
  return sharp(Buffer.from(squareSvg))
    .resize(size, size)
    .png()
    .toBuffer()
}

async function renderMaskable(size) {
  const innerSize = Math.round(size * 0.8)
  const art = await renderSquare(innerSize)
  return sharp({
    create: { width: size, height: size, channels: 3, background: BADGE_BLUE },
  })
    .composite([{ input: art, gravity: 'centre' }])
    .flatten({ background: BADGE_BLUE })
    .removeAlpha()
    .png()
    .toBuffer()
}

async function renderOg(width, height) {
  const artSize = height - 70
  const art = await renderSquare(artSize)
  return sharp({
    create: { width, height, channels: 3, background: BADGE_BLUE },
  })
    .composite([{ input: art, gravity: 'centre' }])
    .flatten({ background: BADGE_BLUE })
    .removeAlpha()
    .png()
    .toBuffer()
}

function buildIco(entries) {
  const count = entries.length
  const headerSize = 6 + count * 16
  let offset = headerSize
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(count, 4)

  const dirEntries = []
  const images = []
  for (const { size, buf } of entries) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(buf.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += buf.length
    dirEntries.push(entry)
    images.push(buf)
  }
  return Buffer.concat([header, ...dirEntries, ...images])
}

function ensureDir(path) {
  mkdirSync(dirname(path), { recursive: true })
}

async function main() {
  const targets = [
    ['public/favicons/favicon-16x16.png', 16],
    ['public/favicons/favicon-32x32.png', 32],
    ['public/favicons/favicon-48x48.png', 48],
    ['public/icons/apple-touch-icon-180x180.png', 180],
    ['public/icons/android-chrome-192x192.png', 192],
    ['public/icons/android-chrome-512x512.png', 512],
    ['src/assets/logo-1x.png', 128],
    ['src/assets/logo-2x.png', 256],
    ['src/assets/logo-3x.png', 384],
  ]

  for (const [relPath, size] of targets) {
    const out = resolve(ROOT, relPath)
    ensureDir(out)
    writeFileSync(out, await renderSquare(size))
    console.log('ok', relPath, `${size}x${size}`)
  }

  for (const size of [192, 512]) {
    const relPath = `public/icons/maskable-icon-${size}x${size}.png`
    const out = resolve(ROOT, relPath)
    ensureDir(out)
    writeFileSync(out, await renderMaskable(size))
    console.log('ok', relPath, `${size}x${size} (safe-zone 80%)`)
  }

  {
    const relPath = 'public/og-image-1200x630.png'
    const out = resolve(ROOT, relPath)
    ensureDir(out)
    writeFileSync(out, await renderOg(1200, 630))
    console.log('ok', relPath, '1200x630')
  }

  {
    const [p16, p32, p48] = await Promise.all([16, 32, 48].map(renderSquare))
    const ico = buildIco([
      { size: 16, buf: p16 },
      { size: 32, buf: p32 },
      { size: 48, buf: p48 },
    ])
    const out = resolve(ROOT, 'public/favicons/favicon.ico')
    ensureDir(out)
    writeFileSync(out, ico)
    console.log('ok', 'public/favicons/favicon.ico', '16/32/48 multi-size')
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
