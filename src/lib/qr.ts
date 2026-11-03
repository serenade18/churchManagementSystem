import QRCode from 'qrcode'
import { BRAND } from '../brand'

// QR codes in the church's darkest colour, with the dove in the middle: small ones for the screen,
// and posters to print or post.

const ink = () => getComputedStyle(document.documentElement).getPropertyValue('--color-sidebar').trim() || '#111613'

let dove: Promise<HTMLImageElement | null> | undefined
const loadDove = () => dove ??= new Promise((resolve) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => resolve(null)
  img.src = BRAND.logoMark
})

/**
 * Draws ``link`` on ``canvas`` (``width`` px square) with the dove on a white tile in the middle.
 * Error correction "H" rebuilds up to 30% of the code, far more than the tile covers.
 * The margin is the white border scanners need.
 */
async function render(canvas: HTMLCanvasElement, link: string, width: number) {
  await QRCode.toCanvas(canvas, link, { width, margin: 3, errorCorrectionLevel: 'H', color: { dark: ink(), light: '#ffffff' } })
  const img = await loadDove()
  if (!img) return
  const ctx = canvas.getContext('2d')!
  const size = canvas.width
  const tile = Math.round(size * 0.2), at = (size - tile) / 2, pad = tile * 0.12
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(at, at, tile, tile, tile * 0.2)
  ctx.fill()
  ctx.drawImage(img, at + pad, at + pad, tile - pad * 2, tile - pad * 2)
}

/** Draws ``link`` on ``canvas``. */
export const drawQr = (canvas: HTMLCanvasElement, link: string, width: number) =>
  render(canvas, link, width).catch(() => {})

/** Splits text into lines no wider than ``width`` on the canvas. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > width) { lines.push(line); line = word } else line = next
  }
  return line ? [...lines, line] : lines
}

/** A printable poster: ``title``, ``subtitle``, the code, and the address it opens (``shown``). */
async function poster(link: string, { title, subtitle, shown }: { title: string; subtitle: string; shown: string }) {
  const W = 1200, pad = 100, qr = W - pad * 2
  const code = document.createElement('canvas')
  await render(code, link, qr)
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = '600 64px Outfit, sans-serif'
  const lines = wrap(ctx, title, W - pad * 2).slice(0, 3)
  const top = pad + lines.length * 76 + 70
  canvas.width = W
  canvas.height = top + qr + 170
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, canvas.height)
  ctx.textAlign = 'center'
  ctx.fillStyle = ink()
  ctx.font = '600 64px Outfit, sans-serif'
  lines.forEach((line, i) => ctx.fillText(line, W / 2, pad + 56 + i * 76))
  ctx.font = '36px Figtree, sans-serif'
  ctx.fillStyle = '#5f6e67'
  ctx.fillText(subtitle, W / 2, top - 24)
  ctx.drawImage(code, pad, top)
  ctx.font = '600 40px Figtree, sans-serif'
  ctx.fillStyle = ink()
  ctx.fillText(shown, W / 2, top + qr + 100)
  return canvas.toDataURL('image/png')
}

/** Saves the poster as ``<filename>-qr.png``. */
export async function downloadPoster(link: string, text: { title: string; subtitle: string; shown: string }, filename: string) {
  const a = document.createElement('a')
  a.href = await poster(link, text)
  a.download = `${filename.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '')}-qr.png`
  a.click()
}
