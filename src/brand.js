/**
 * This build's built-in look, used until an admin changes it in Settings > Branding.
 * Each organisation's branch keeps its own copy of this file, index.css's palette and public/ logos.
 */
export const BRAND = {
  name: import.meta.env.VITE_CHURCH_NAME || 'mKanisa',
  tagline: 'Church Management',
  primary: '#187a34', // mKanisa green, deep enough for white text (index.css --color-primary)
  sidebar: '#111613', // the wordmark's black (index.css --color-sidebar)
  chart: '#1e963f',   // index.css --color-brand-600
  logo: '/logo.png',
  logoMark: '/logo-mark.png', // the dove: tiles and small spots
  // Each church's own Paybill: never fall back to another's number.
  paybill: import.meta.env.VITE_PAYBILL_NUMBER || '(Paybill not set)',
  // Churches that set their own name in Settings > Branding still show this on public pages.
  poweredBy: 'mKanisa',
}
