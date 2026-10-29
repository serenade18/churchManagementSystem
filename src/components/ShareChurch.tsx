import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, Download, ExternalLink, Share2 } from 'lucide-react'
import { branding } from '../lib/theme'

// The church's home page as a link and a QR code, for announcements, WhatsApp groups and printed
// posters. The code is drawn in the browser; the download is a poster with the church's name on it.

const ink = () => getComputedStyle(document.documentElement).getPropertyValue('--color-sidebar').trim() || '#111613'

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

async function poster(link: string, shown: string, name: string) {
  const W = 1200, pad = 100, qr = W - pad * 2
  const code = document.createElement('canvas')
  // The margin is the white border scanners need; it also keeps the text clear of the code.
  await QRCode.toCanvas(code, link, { width: qr, margin: 3, errorCorrectionLevel: 'M', color: { dark: ink(), light: '#ffffff' } })
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = '600 64px Outfit, sans-serif'
  const title = wrap(ctx, name, W - pad * 2).slice(0, 3)
  const top = pad + title.length * 76 + 70
  canvas.width = W
  canvas.height = top + qr + 170
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, canvas.height)
  ctx.textAlign = 'center'
  ctx.fillStyle = ink()
  ctx.font = '600 64px Outfit, sans-serif'
  title.forEach((line, i) => ctx.fillText(line, W / 2, pad + 56 + i * 76))
  ctx.font = '36px Figtree, sans-serif'
  ctx.fillStyle = '#5f6e67'
  ctx.fillText('Scan to visit our church page', W / 2, top - 24)
  ctx.drawImage(code, pad, top)
  ctx.font = '600 40px Figtree, sans-serif'
  ctx.fillStyle = ink()
  ctx.fillText(shown, W / 2, top + qr + 100)
  return canvas.toDataURL('image/png')
}

export default function ShareChurch() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const link = `${window.location.origin}/`
  const shown = window.location.host
  const name = branding.name

  useEffect(() => {
    if (canvas.current) QRCode.toCanvas(canvas.current, link, { width: 144, margin: 3, color: { dark: ink(), light: '#ffffff' } }).catch(() => {})
  }, [link])

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* no clipboard */ }
  }

  const download = async () => {
    setBusy(true)
    try {
      const a = document.createElement('a')
      a.href = await poster(link, shown, name)
      a.download = `${shown.replace(/[^a-z0-9.-]/gi, '-')}-qr.png`
      a.click()
    } finally { setBusy(false) }
  }

  const share = async () => {
    const text = `Visit ${name} online: ${link}`
    if (navigator.share) {
      try { await navigator.share({ title: name, text: `Visit ${name} online`, url: link }) } catch { /* cancelled */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    }
  }

  return (
    <section aria-labelledby="share-title" className="flex flex-col gap-5 rounded-[22px] border border-mk-border bg-white p-[18px] sm:flex-row sm:items-center sm:p-6">
      <canvas ref={canvas} role="img" aria-label={`QR code for ${shown}`} className="h-36 w-36 flex-none self-center rounded-lg border border-mk-mist bg-white" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <header className="flex flex-col gap-0.5">
          <h2 id="share-title" className="font-display text-xl font-semibold text-mk-forest">Share your church page</h2>
          <p className="text-sm text-mk-muted">Put the QR code on posters and screens, or send the link in announcements and WhatsApp groups. It opens your church’s home page, where people can give and register.</p>
        </header>
        <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 self-start break-all font-mono text-[15px] text-brand-700 hover:underline">
          {shown}<ExternalLink className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
        </a>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={copy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Link copied' : 'Copy link'}
          </button>
          <button type="button" className="btn-secondary" onClick={download} disabled={busy}><Download className="h-4 w-4" /> Download QR code</button>
          <button type="button" className="btn-secondary" onClick={share}><Share2 className="h-4 w-4" /> Share</button>
        </div>
      </div>
    </section>
  )
}
