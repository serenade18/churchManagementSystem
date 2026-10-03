/**
 * The organisation's branding (Settings > Branding): name, tagline, logos and colours, loaded from the
 * API before the app draws. Colours are turned into the brand palette and the primary/sidebar tokens
 * that index.css uses, with text colours picked for readability.
 */
import { API_URL } from './api'

const DEFAULTS = {
  name: import.meta.env.VITE_CHURCH_NAME || 'JDO Africa',
  tagline: 'Donor Management',
  logo: '/logo.png',
  logoMark: '/logo-mark.png',
}

// Current branding; read at render time (set once at startup, then the page reloads after edits).
export const branding = { ...DEFAULTS }

// --- colour maths -------------------------------------------------------------------------------

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const toHex = (rgb) => `#${rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`
const mix = (hex, other, amount) => toHex(toRgb(hex).map((c, i) => c + (toRgb(other)[i] - c) * amount))
const luminance = (hex) => {
  const [r, g, b] = toRgb(hex).map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
export const isHex = (value) => /^#[0-9a-f]{6}$/i.test(value || '')

/** Darken a colour step by step until white text on it (or it on white) reaches `ratio`. */
const darkenUntil = (hex, ratio) => {
  let out = hex
  for (let i = 0; i < 20 && contrast(out, '#ffffff') < ratio; i++) out = mix(out, '#000000', 0.08)
  return out
}

/** Every CSS variable a primary and sidebar colour produce. */
export function themeTokens(primary, sidebar) {
  const tokens = {}
  if (isHex(primary)) {
    const textSafe = darkenUntil(primary, 4.8) // links and headings on white
    Object.assign(tokens, {
      '--color-brand-50': mix(primary, '#ffffff', 0.92),
      '--color-brand-100': mix(primary, '#ffffff', 0.84),
      '--color-brand-200': mix(primary, '#ffffff', 0.62),
      '--color-brand-500': primary,
      '--color-brand-600': contrast(primary, '#ffffff') >= 3 ? primary : darkenUntil(primary, 3), // icons, charts
      '--color-brand-700': textSafe,
      '--color-brand-800': mix(textSafe, '#000000', 0.25),
      '--color-brand-900': mix(textSafe, '#000000', 0.45),
      '--color-primary': primary,
      '--color-primary-hover': mix(primary, '#000000', 0.15),
      // Whichever of white or near-black reads better on the button.
      '--color-on-primary': contrast(primary, '#ffffff') >= contrast(primary, '#0f172a') ? '#ffffff' : '#0f172a',
    })
  }
  if (isHex(sidebar)) {
    // The sidebar carries white text, so very light choices are darkened until it reads.
    tokens['--color-sidebar'] = darkenUntil(sidebar, 7)
  }
  return tokens
}

export const sidebarAdjusted = (sidebar) => isHex(sidebar) && darkenUntil(sidebar, 7) !== sidebar.toLowerCase()

export function applyTheme(primary, sidebar, root = document.documentElement) {
  Object.entries(themeTokens(primary, sidebar)).forEach(([key, value]) => root.style.setProperty(key, value))
}

/** A colour from the live palette (charts need real values, not classes). */
export const brandColor = (shade = 600) =>
  getComputedStyle(document.documentElement).getPropertyValue(`--color-brand-${shade}`).trim() || '#b2883e'

// --- loading ------------------------------------------------------------------------------------

export const assetUrl = (path) => (path ? `${API_URL}${path}` : null)

function apply(data) {
  branding.name = data.name || DEFAULTS.name
  branding.tagline = data.tagline || DEFAULTS.tagline
  branding.logo = assetUrl(data.logo_url) || DEFAULTS.logo
  branding.logoMark = assetUrl(data.logo_mark_url) || assetUrl(data.logo_url) || DEFAULTS.logoMark
  branding.raw = data
  applyTheme(data.primary_color, data.sidebar_color)
  document.title = `${branding.name} - ${branding.tagline}`
  document.querySelectorAll("link[rel='icon'], link[rel='apple-touch-icon']").forEach((link) => {
    if (data.logo_mark_url || data.logo_url) link.href = branding.logoMark
  })
}

/** Fetch the branding before the first render; on a slow or failed request the built-in look is used. */
export async function loadBranding(timeoutMs = 3000) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(`${API_URL}/branding/`, { signal: controller.signal })
    clearTimeout(timer)
    if (res.ok) apply(await res.json())
    else apply({})
  } catch {
    apply({})
  }
}
