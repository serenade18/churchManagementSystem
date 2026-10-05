/**
 * This build's built-in look, used until an admin changes it in Settings > Branding.
 * Each organisation's branch keeps its own copy of this file, index.css's palette and public/ logos.
 */
export const BRAND = {
  name: import.meta.env.VITE_CHURCH_NAME || 'JDO Africa',
  tagline: 'Donor Management',
  primary: '#eab200', // gold: buttons and the active menu item (index.css --color-primary)
  sidebar: '#343a40', // charcoal: sidebar and sign-in background (index.css --color-sidebar)
  chart: '#b2883e',   // bronze, index.css --color-brand-600
  logo: '/logo.png',
  logoMark: '/logo-mark.png', // square spots: tiles, favicon
  // Each organisation's own Paybill: never fall back to another's number.
  paybill: import.meta.env.VITE_PAYBILL_NUMBER || '(Paybill not set)',
}
