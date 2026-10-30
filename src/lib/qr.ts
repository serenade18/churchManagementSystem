import QRCode from 'qrcode'

// QR codes in the church's darkest colour: small ones for the screen, and posters to print or post.

const ink = () => getComputedStyle(document.documentElement).getPropertyValue('--color-sidebar').trim() || '#111613'

/** Draws ``link`` on ``canvas``; the margin is the white border scanners need. */
export const drawQr = (canvas: HTMLCanvasElement, link: string, width: number) =>
  QRCode.toCanvas(canvas, link, { width, margin: 3, color: { dark: ink(), light: '#ffffff' } }).catch(() => {})

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
  await QRCode.toCanvas(code, link, { width: qr, margin: 3, errorCorrectionLevel: 'M', color: { dark: ink(), light: '#ffffff' } })
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
