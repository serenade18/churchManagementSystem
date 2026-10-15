/**
 * The organisation's branding (Settings > Branding): name, tagline, logos and colours, loaded from the
 * API before the app draws. Colours are turned into the brand palette and the primary/sidebar tokens
 * that index.css uses, with text colours picked for readability.
 */
import { API_URL } from './api'
import { setDemoContext } from './demo'
import { BRAND } from '../brand'
import type { Branding } from '../types'

const DEFAULTS = { name: BRAND.name, tagline: BRAND.tagline, logo: BRAND.logo, logoMark: BRAND.logoMark }

// Current branding; read at render time (set once at startup, then the page reloads after edits).
export const branding: typeof DEFAULTS & { raw?: Branding } = { ...DEFAULTS }

// --- colour maths -------------------------------------------------------------------------------

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const toHex = (rgb: number[]) => `#${rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`
const mix = (hex: string, other: string, amount: number) => toHex(toRgb(hex).map((c, i) => c + (toRgb(other)[i] - c) * amount))
const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
export const isHex = (value: string | null | undefined): value is string => /^#[0-9a-f]{6}$/i.test(value || '')

/** Darken a colour step by step until white text on it (or it on white) reaches `ratio`. */
const darkenUntil = (hex: string, ratio: number) => {
  let out = hex
  for (let i = 0; i < 20 && contrast(out, '#ffffff') < ratio; i++) out = mix(out, '#000000', 0.08)
  return out
}

/** Every CSS variable a primary and sidebar colour produce. */
export function themeTokens(primary?: string, sidebar?: string) {
  const tokens: Record<string, string> = {}
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

export const sidebarAdjusted = (sidebar: string) => isHex(sidebar) && darkenUntil(sidebar, 7) !== sidebar.toLowerCase()

export function applyTheme(primary?: string, sidebar?: string, root = document.documentElement) {
  Object.entries(themeTokens(primary, sidebar)).forEach(([key, value]) => root.style.setProperty(key, value))
}

/** A colour from the live palette (charts need real values, not classes). */
export const brandColor = (shade = 600) =>
  getComputedStyle(document.documentElement).getPropertyValue(`--color-brand-${shade}`).trim() || BRAND.chart

// --- loading ------------------------------------------------------------------------------------

export const assetUrl = (path: string | null | undefined) => (path ? `${API_URL}${path}` : null)

function apply(data: Branding) {
  branding.name = data.name || DEFAULTS.name
  branding.tagline = data.tagline || DEFAULTS.tagline
  branding.logo = assetUrl(data.logo_url) || DEFAULTS.logo
  branding.logoMark = assetUrl(data.logo_mark_url) || assetUrl(data.logo_url) || DEFAULTS.logoMark
  branding.raw = data
  setDemoContext(branding.name, data)
  applyTheme(data.primary_color, data.sidebar_color)
  document.title = `${branding.name} - ${branding.tagline}`
  document.querySelectorAll("link[rel='icon'], link[rel='apple-touch-icon']").forEach((link) => {
    if (data.logo_mark_url || data.logo_url) (link as HTMLLinkElement).href = branding.logoMark
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
