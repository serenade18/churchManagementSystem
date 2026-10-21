import { branding } from '../lib/theme'
import { BRAND } from '../brand'

/**
 * The organisation's logo (Settings > Branding, else public/logo.png): the full logo where there is room,
 * the square mark in small spots. Tiles sit on white so they stay legible on dark backgrounds.
 */
export default function Logo({ className = 'h-12', tile = false, mark = tile }: { className?: string; tile?: boolean; mark?: boolean }) {
  const img = (
    <img src={mark ? branding.logoMark : branding.logo} alt={`${branding.name} logo`}
      className={`${tile ? 'h-full' : className} w-auto object-contain`} />
  )
  if (!tile) return img
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ${className}`}>{img}</span>
}

/**
 * "Powered by mKanisa" on public pages once a church shows its own name (``always``: even before),
 * nothing on other builds.
 */
export function PoweredBy({ className = 'text-center text-slate-400', always = false, wordmark = false }) {
  if (!BRAND.poweredBy || (!always && branding.name === BRAND.poweredBy)) return null
  if (wordmark) return ( // the built-in logo is the platform's wordmark on builds that say "Powered by"
    <p className={`inline-flex items-center gap-1.5 text-xs ${className}`}>Powered by <img src={BRAND.logo} alt={BRAND.poweredBy} className="h-3.5 w-auto" /></p>
  )
  return <p className={`text-xs ${className}`}>Powered by <span className="font-semibold">{BRAND.poweredBy}</span></p>
}
