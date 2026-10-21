import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CircleAlert, ShieldCheck } from 'lucide-react'
import Logo, { PoweredBy } from './Logo'
import { assetUrl, branding } from '../lib/theme'

/** The church's dark colour (Settings > Branding) at a strength, for veils over photographs. */
export const shade = (percent: number) => `color-mix(in srgb, var(--color-sidebar) ${percent}%, transparent)`

/** The church's own cover photo, else one of mKanisa's (the platform uses its congregation). */
export function churchPhoto(fallback: string) {
  if (branding.platform) return '/landing/hero-congregation.jpg'
  return assetUrl(branding.raw?.cover_url) || fallback
}

function ChurchName({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex min-w-0 items-center gap-3 ${className}`}>
      <Logo tile className="h-11 w-11" />
      <span className="truncate font-display text-lg font-semibold">{branding.name}</span>
    </Link>
  )
}

/**
 * Staff sign-in and sign-up: the church's photograph and name on one side (on top on phones),
 * the form on warm ivory on the other. On mkanisa.com the side is mKanisa's own: the congregation
 * under deep forest and the ivory wordmark, with a gold ``badge`` ("Platform admin") where it helps.
 */
export function StaffAuthLayout({ aside, children, width = 'max-w-[400px]', badge }: { aside: ReactNode; children: ReactNode; width?: string; badge?: string }) {
  const platform = branding.platform
  return (
    <div className="flex min-h-screen flex-wrap bg-mk-ivory font-body text-base leading-relaxed text-mk-slate">
      <aside className={`relative flex min-h-[300px] flex-[1_1_520px] overflow-hidden ${platform ? 'bg-mk-midnight text-mk-ivory' : 'bg-sidebar text-white'}`}>
        {platform ? (
          <>
            <img src="/landing/hero-congregation.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[62%_35%]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,29,27,0.82)_0%,rgba(16,43,39,0.66)_40%,rgba(11,29,27,0.96)_100%)]" />
          </>
        ) : (
          <>
            <img src={churchPhoto('/landing/church-cover.jpg')} alt="" className="absolute inset-0 h-full w-full object-cover object-[55%_45%]" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${shade(55)} 0%, ${shade(20)} 40%, ${shade(88)} 100%)` }} />
          </>
        )}
        <div className="relative flex w-full flex-col justify-between gap-10 px-6 py-8 sm:px-12 sm:py-10">
          {platform ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link to="/" className="flex items-center"><img src="/logo-ivory.png" alt="mKanisa" className="h-[30px] w-auto" /></Link>
              {badge && (
                <span className="inline-flex items-center gap-2 rounded-full border border-mk-gold/45 bg-mk-gold/12 py-1.5 pl-2.5 pr-3.5 text-[13px] font-semibold tracking-[0.04em] text-mk-amber">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />{badge}
                </span>
              )}
            </div>
          ) : <ChurchName />}
          <div className="max-w-[460px]">{aside}</div>
        </div>
      </aside>
      <main className="flex min-w-0 flex-[1_1_480px] flex-col justify-center px-5 py-12 sm:px-8 sm:py-14">
        <div className={`mx-auto flex w-full flex-col gap-7 ${width}`}>{children}</div>
      </main>
    </div>
  )
}

/** "Setting up platform access": a platform admin's signup, ``current`` highlighted in mint. */
export function PlatformSteps({ current }: { current: 1 | 2 }) {
  const steps: [string, string][] = [
    ['Setup key and your details', 'The key comes from whoever runs the server.'],
    ['Confirm your phone', 'Enter the 6-digit code we SMS you.'],
    ['Open the platform', 'Add churches, their first owner, and watch over them all.'],
  ]
  return (
    <div className="flex flex-col gap-5">
      <p className="font-display text-[30px] font-semibold leading-[1.15] tracking-[-0.015em] sm:text-[34px]">Setting up platform access</p>
      <ol className="flex flex-col gap-4">
        {steps.map(([title, text], i) => {
          const n = i + 1
          return (
            <li key={title} className="flex gap-4" aria-current={n === current ? 'step' : undefined}>
              <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border text-sm font-bold ${
                n === current ? 'border-mk-mint bg-mk-mint text-mk-midnight' : n < current ? 'border-mk-mint/50 bg-mk-mint/20 text-mk-mint' : 'border-mk-ivory/40'}`}>
                {n < current ? '✓' : n}
              </span>
              <span className="flex flex-col"><span className="font-semibold">{title}</span><span className="text-[15px] text-mk-ivory/75">{n < current ? 'Done.' : text}</span></span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** The staff pages' big title, with an optional step label above it. */
export function AuthTitle({ step, title, children }: { step?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {step && <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-brand-700">{step}</p>}
      <h1 className="font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.015em] text-mk-forest sm:text-[40px]">{title}</h1>
      {children && <p className="text-mk-muted">{children}</p>}
    </div>
  )
}

const STAFF_STEPS: [string, string][] = [
  ['Your details', 'Your name, phone and a password.'],
  ['Confirm your phone', 'Enter the 6-digit code we SMS you.'],
  ['Get your role', 'The church owner chooses what you look after: a branch, the treasury, SMS.'],
]

/** "Joining the church office" (or another ``title``): a signup's three steps, ``current`` highlighted. */
export function SignupSteps({ current, title = 'Joining the church office', steps = STAFF_STEPS }: { current: 1 | 2 | 3; title?: string; steps?: [string, string][] }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="font-display text-[30px] font-semibold leading-[1.15] tracking-[-0.015em] sm:text-[34px]">{title}</p>
      <ol className="flex flex-col gap-4">
        {steps.map(([title, text], i) => {
          const n = i + 1
          return (
            <li key={title} className="flex gap-4" aria-current={n === current ? 'step' : undefined}>
              <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border border-white/50 text-sm font-bold ${n === current ? 'bg-white text-sidebar' : n < current ? 'bg-white/20' : ''}`}>
                {n < current ? '✓' : n}
              </span>
              <span className="flex flex-col"><span className="font-semibold">{title}</span><span className="text-[15px] text-white/80">{n < current ? 'Done.' : text}</span></span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/**
 * Member pages (My giving sign-in, joining the church): phone-first. A photo header with the
 * church's name and a sheet over it; on wider screens the same, as a centred card.
 */
export function MemberAuthLayout({ photo, compact = false, back, children }: { photo: string; compact?: boolean; back?: string | (() => void); children: ReactNode }) {
  const backClass = 'flex h-11 w-11 flex-none items-center justify-center rounded-full border border-white/30 bg-white/15 hover:bg-white/25'
  const arrow = <ArrowLeft className="h-5 w-5" aria-hidden="true" />
  return (
    <div className="min-h-screen bg-mk-ivory font-body text-base leading-relaxed text-mk-slate sm:flex sm:items-start sm:justify-center sm:bg-mk-mist sm:px-4 sm:py-10">
      <div className="flex min-h-screen w-full flex-col sm:min-h-0 sm:max-w-[440px] sm:overflow-hidden sm:rounded-[28px] sm:shadow-[0_2px_4px_rgba(16,43,39,0.06),0_40px_80px_-40px_rgba(16,43,39,0.4)]">
        <div className={`relative flex-none bg-sidebar text-white ${compact ? 'h-[170px]' : 'h-[300px]'}`}>
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_28%]" />
          <div className="absolute inset-0" style={{ background: compact
            ? `linear-gradient(180deg, ${shade(60)} 0%, ${shade(75)} 100%)`
            : `linear-gradient(180deg, ${shade(55)} 0%, ${shade(5)} 40%, ${shade(70)} 100%)` }} />
          <div className={`relative flex h-full flex-col p-[22px] ${compact ? '' : 'justify-between pb-[52px]'}`}>
            <div className="flex min-w-0 items-center gap-3">
              {typeof back === 'string' && <Link to={back} aria-label="Back" className={backClass}>{arrow}</Link>}
              {typeof back === 'function' && <button type="button" onClick={back} aria-label="Back" className={backClass}>{arrow}</button>}
              <ChurchName />
            </div>
            {!compact && <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/85">Member portal</p>}
          </div>
        </div>
        <main className="relative -mt-7 flex flex-1 flex-col gap-6 rounded-t-[28px] bg-mk-ivory px-[22px] pb-6 pt-[30px] sm:rounded-b-[28px]">
          {children}
        </main>
      </div>
    </div>
  )
}

/** "Powered by mKanisa" under the member pages. */
export function MemberFooter() {
  return <PoweredBy wordmark className="justify-center text-mk-muted" />
}

/**
 * A 6-digit SMS code as six boxes. One real input lies over them, so phones can fill the code
 * straight from the SMS, screen readers read one field, and pasting works.
 */
export function CodeInput({ id, label, value, onChange, autoFocus = false, invalid = false }:
  { id: string; label: string; value: string; onChange: (code: string) => void; autoFocus?: boolean; invalid?: boolean }) {
  const [focused, setFocused] = useState(autoFocus)
  const cursor = Math.min(value.length, 5)
  return (
    <div className="relative">
      <div className="flex gap-2 sm:gap-2.5" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={`flex h-[60px] min-w-0 flex-1 items-center justify-center rounded-[14px] border bg-white font-display text-[26px] font-semibold text-mk-forest sm:h-16 sm:text-[28px] ${
            invalid ? 'border-[#D9826F]' : focused && i === cursor ? 'border-2 border-brand-600' : 'border-mk-border'}`}>
            {value[i] || ''}
          </span>
        ))}
      </div>
      <input id={id} aria-label={label} aria-invalid={invalid || undefined} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
        autoFocus={autoFocus} value={value} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none [letter-spacing:2em] selection:bg-transparent" />
    </div>
  )
}

/** The pill buttons and inputs the sign-in pages share. */
export const authInput = 'h-[52px] w-full rounded-xl border border-mk-border bg-white px-4 text-base text-mk-forest outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100'
export const authPrimary = 'inline-flex h-[54px] w-full items-center justify-center rounded-full bg-primary px-6 text-base font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60'
export const authSecondary = 'inline-flex h-[52px] w-full items-center justify-center rounded-full border border-mk-border bg-white px-6 font-semibold text-mk-forest transition hover:border-brand-200'
export const authLabel = 'text-sm font-semibold text-mk-forest'
/** PasswordInput's own classes, grown to the sign-in pages' size. */
export const authPassword = 'h-[52px]! rounded-xl! px-4! pr-12! text-base! border-mk-border! text-mk-forest! shadow-none!'

/** A problem with what was sent, in a calm red. */
export function AuthAlert({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <div role="alert" className="flex gap-3 rounded-[14px] border border-[#F0C7BF] bg-[#FBEDEA] px-4 py-3.5 text-[15px] text-[#8E2F22]">
      <CircleAlert className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/** A labelled field on the sign-in pages; ``optional`` adds a quiet "Optional". */
export function AuthField({ label, optional = false, error, hint, children }: { label: string; optional?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5">
        <span className={authLabel}>{label}{optional && <span className="font-normal text-mk-muted"> (optional)</span>}</span>
        {children}
      </label>
      {hint && !error && <span className="text-[13px] text-mk-muted">{hint}</span>}
      {error && <span className="text-[13px] text-[#8E2F22]">{error}</span>}
    </div>
  )
}

/** "No SMS yet? New code in 0:42", then a button once a new code may be sent. */
export function ResendCode({ seconds, onResend, busy }: { seconds: number; onResend: () => void; busy?: boolean }) {
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return (
    <p className="text-center text-[15px] text-mk-muted">
      No SMS yet?{' '}
      {seconds > 0
        ? <span className="font-semibold text-mk-slate">New code in {clock}</span>
        : <button type="button" onClick={onResend} disabled={busy} className="min-h-11 font-semibold text-brand-700 hover:underline disabled:opacity-60">Send a new code</button>}
    </p>
  )
}

/** Counts down from ``from`` seconds; the setter starts it again (from ``from``, or a given number). */
export function useCountdown(from: number) {
  const [left, setLeft] = useState(from)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return [left, (n: number = from) => setLeft(n)] as const
}

/** 0712345678 → "0712 ••• 678", so a shoulder-reader doesn't learn the whole number. */
export const maskPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  const local = digits.startsWith('254') ? `0${digits.slice(3)}` : digits
  return local.length >= 7 ? `${local.slice(0, 4)} ••• ${local.slice(-3)}` : phone
}
