import { CHURCH_NAME } from '../lib/format'

/** The church logo (public/logo.png). Sits on a white tile so it stays legible on dark backgrounds. */
export default function Logo({ className = 'h-12', tile = false }) {
  const img = <img src="/logo.png" alt={`${CHURCH_NAME} logo`} className={`${tile ? 'h-full' : className} w-auto object-contain`} />
  if (!tile) return img
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ${className}`}>{img}</span>
}
