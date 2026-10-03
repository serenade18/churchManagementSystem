import { branding } from '../lib/theme'

/**
 * The organisation's logo (Settings > Branding, else public/logo.png): the full logo where there is room,
 * the square mark in small spots. Tiles sit on white so they stay legible on dark backgrounds.
 */
export default function Logo({ className = 'h-12', tile = false, mark = tile }) {
  const img = (
    <img src={mark ? branding.logoMark : branding.logo} alt={`${branding.name} logo`}
      className={`${tile ? 'h-full' : className} w-auto object-contain`} />
  )
  if (!tile) return img
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ${className}`}>{img}</span>
}
