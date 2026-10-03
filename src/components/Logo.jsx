import { CHURCH_NAME } from '../lib/format'

/**
 * The organisation's logo. The full logo (public/logo.png) where there is room; the emblem
 * (public/logo-mark.png) in small square spots. Tiles sit on white so they stay legible on dark backgrounds.
 */
export default function Logo({ className = 'h-12', tile = false, mark = tile }) {
  const img = (
    <img src={mark ? '/logo-mark.png' : '/logo.png'} alt={`${CHURCH_NAME} logo`}
      className={`${tile ? 'h-full' : className} w-auto object-contain`} />
  )
  if (!tile) return img
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ${className}`}>{img}</span>
}
