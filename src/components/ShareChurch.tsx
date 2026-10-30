import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Download, ExternalLink, Share2 } from 'lucide-react'
import { downloadPoster, drawQr } from '../lib/qr'
import { branding } from '../lib/theme'

// The church's home page as a link and a QR code, for announcements, WhatsApp groups and printed
// posters. The code is drawn in the browser; the download is a poster with the church's name on it.

export default function ShareChurch() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const link = `${window.location.origin}/`
  const shown = window.location.host
  const name = branding.name

  useEffect(() => {
    if (canvas.current) drawQr(canvas.current, link, 144)
  }, [link])

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* no clipboard */ }
  }

  const download = async () => {
    setBusy(true)
    try { await downloadPoster(link, { title: name, subtitle: 'Scan to visit our church page', shown }, shown) } finally { setBusy(false) }
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
