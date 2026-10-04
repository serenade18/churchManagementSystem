/**
 * This build's built-in look, used until an admin changes it in Settings > Branding.
 * Each organisation's branch keeps its own copy of this file, index.css's palette and public/ logos.
 */
export const BRAND = {
  name: import.meta.env.VITE_CHURCH_NAME || 'PCEA Milele',
  tagline: 'Church Management',
  primary: '#1d43b0', // buttons and the active menu item (index.css --color-primary)
  sidebar: '#172e6b', // sidebar and sign-in background (index.css --color-sidebar)
  chart: '#2453d9',   // index.css --color-brand-600
  logo: '/logo.png',
  logoMark: '/logo.png', // square spots: tiles, favicon
  paybill: import.meta.env.VITE_PAYBILL_NUMBER || '785610',
}
