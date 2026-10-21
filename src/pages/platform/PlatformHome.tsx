import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { type LucideIcon, ArrowRight, ChartLine, Check, Church, HeartHandshake, MessageSquare, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react'
import { request } from '../../lib/api'
import { BRAND } from '../../brand'
import { branding } from '../../lib/theme'
import type { DirectoryChurch } from '../../types'

const FEATURES: [LucideIcon, string, string, string][] = [
  [HeartHandshake, 'Digital giving', 'M-PESA, Airtel Money and PayPal, an SMS receipt for every gift, and projects that show their progress.', 'bg-mk-amber'],
  [Users, 'Members and registration', 'A registration link for your church, an approval queue, and a full member register by branch.', 'bg-mk-mint'],
  [RefreshCw, 'Paybill reconciliation', 'Upload your M-PESA statement and mKanisa makes the records match, both ways, with nothing missed.', 'bg-mk-sky/30'],
  [MessageSquare, 'Bulk SMS', 'Reach a branch, a group or the whole church, with delivery reports for every message.', 'bg-mk-lavender/35'],
  [ShieldCheck, 'Roles and branches', 'Treasurers, secretaries, pastors and branch admins each see what their role needs, and nothing more.', 'bg-mk-coral/35'],
  [ChartLine, 'Reports and statements', 'Dashboards for leaders, printable receipts, and yearly giving statements members can download.', 'bg-mk-mist'],
]

const STEPS: [string, string][] = [
  ['A member gives', "On the church's give page or straight to its Paybill. The M-PESA or Airtel Money prompt arrives on their phone."],
  ['mKanisa matches it', "By membership number or phone, never by guesswork. Anything unclear waits in the treasurer's review inbox."],
  ['Everyone can see it', "An SMS receipt goes out, the dashboard updates, and the gift appears on the member's statement. The M-PESA statement sync keeps the books true."],
]

// The sample giving chart in the hero: a calm rise towards this month, which is highlighted.
const BARS = [38, 46, 41, 52, 49, 58, 55, 63, 60, 70, 74, 86]

// Darkest where the words sit (top for the menu, left and bottom for the headline), clear over the faces.
const HERO_VEIL = 'linear-gradient(180deg, rgba(11,29,27,.55) 0%, rgba(11,29,27,0) 22%), '
  + 'linear-gradient(90deg, rgba(11,29,27,.86) 0%, rgba(11,29,27,.55) 45%, rgba(11,29,27,.05) 80%), '
  + 'linear-gradient(0deg, rgba(11,29,27,.7) 0%, rgba(11,29,27,0) 45%)'
const CLOSING_VEIL = 'linear-gradient(180deg, rgba(11,29,27,.72) 0%, rgba(16,43,39,.84) 100%)'

function Ticks({ items, dark = false }: { items: string[]; dark?: boolean }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((text) => (
        <li key={text} className="flex gap-3">
          <Check className={`mt-1 h-5 w-5 flex-none ${dark ? 'text-mk-mint' : 'text-mk-green'}`} strokeWidth={2.25} aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  )
}

function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <p className={`text-[13px] font-semibold uppercase tracking-[0.12em] ${dark ? 'text-mk-mint' : 'text-mk-green'}`}>{children}</p>
}

function Heading({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <h2 className={`font-display text-[clamp(32px,3.6vw,46px)] font-semibold leading-[1.12] tracking-[-0.015em] ${dark ? 'text-mk-ivory' : 'text-mk-forest'}`}>{children}</h2>
}

/** mkanisa.com: what mKanisa is, for churches and their members, and the churches on it. */
export default function PlatformHome() {
  const [churches, setChurches] = useState<DirectoryChurch[] | null>(null)
  const [query, setQuery] = useState('')
  useEffect(() => { request<DirectoryChurch[]>('/platform/directory/', { auth: false }).then(setChurches).catch(() => setChurches([])) }, [])
  const contact = branding.raw?.contact_email
  const join = contact ? `mailto:${contact}?subject=Bringing our church to mKanisa` : '#directory'
  const shown = (churches || []).filter((c) => `${c.name} ${c.location}`.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div className="bg-mk-ivory font-body text-base leading-relaxed text-mk-slate">
      {/* Hero: the congregation, full width, with the words resting in its quiet left side */}
      <section id="top" className="relative overflow-hidden bg-mk-midnight text-mk-ivory">
        <img src="/landing/hero-congregation.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[62%_35%]" />
        <div className="absolute inset-0" style={{ background: HERO_VEIL }} />
        <div className="relative mx-auto flex min-h-[760px] max-w-7xl sm:min-h-[860px] flex-col justify-between gap-16 px-5 pb-14 sm:px-10">
          <header className="flex flex-wrap items-center gap-x-10 gap-y-4 pt-7">
            <a href="#top"><img src="/logo-ivory.png" alt={BRAND.name} className="h-7 w-auto sm:h-[30px]" /></a>
            <nav aria-label="Main" className="hidden flex-1 flex-wrap justify-end gap-x-8 gap-y-1 text-sm font-medium uppercase tracking-[0.08em] lg:flex">
              <a href="#features" className="hover:text-mk-mint">Features</a>
              <a href="#how" className="hover:text-mk-mint">Giving</a>
              <a href="#members" className="hover:text-mk-mint">For members</a>
              <a href="#pricing" className="hover:text-mk-mint">Pricing</a>
            </nav>
            <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-3 text-[15px] font-medium lg:ml-0">
              <Link to="/me" className="hover:text-mk-mint">Sign in</Link>
              <a href={join} className="inline-flex min-h-11 items-center rounded-full bg-mk-ivory px-5 font-semibold text-mk-forest hover:bg-white">Bring your church</a>
            </div>
          </header>

          <div className="flex flex-wrap items-end justify-between gap-10">
            <div className="flex min-w-0 flex-[1_1_620px] flex-col gap-7">
              <p className="inline-flex items-center gap-2.5 self-start rounded-full border border-mk-ivory/30 bg-mk-midnight/35 py-1.5 pl-2 pr-4 text-sm font-medium">
                <img src={BRAND.logoMark} alt="" className="h-[22px] w-[22px]" /> Church management, giving &amp; community
              </p>
              <h1 className="font-display text-[clamp(48px,7.2vw,108px)] font-semibold leading-[0.98] tracking-[-0.025em]">
                A quiet, well-ordered home <span className="font-light text-mk-mint">for your church.</span>
              </h1>
              <p className="max-w-[560px] text-[19px] leading-relaxed text-mk-mist">
                Members, giving, M-PESA reconciliation and communication in one calm place for church leaders, and one account for every member's giving.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a href={join} className="inline-flex min-h-14 items-center rounded-full bg-mk-mint px-7 text-[17px] font-semibold text-mk-forest hover:bg-white">Bring your church to mKanisa</a>
                <a href={join} aria-label="Get started" className="hidden h-14 w-14 sm:inline-flex items-center justify-center rounded-full bg-mk-mint text-mk-forest hover:bg-white"><ArrowRight className="h-5 w-5" aria-hidden="true" /></a>
                <a href="#directory" className="inline-flex min-h-14 items-center px-5 font-semibold underline decoration-mk-ivory/45 underline-offset-[6px] hover:decoration-mk-mint">Find your church</a>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-mk-mist">
                {['M-PESA & Airtel Money', 'An SMS receipt for every gift', "Your church's own address"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-mk-mint" strokeWidth={2.5} aria-hidden="true" />{t}</li>
                ))}
              </ul>
            </div>

            {/* What the treasurer sees: an illustration, not a real church's figures */}
            <figure className="flex min-w-0 flex-[0_1_320px] flex-col gap-3.5 rounded-[22px] border border-mk-mint/20 bg-mk-midnight/80 px-6 py-5 shadow-[0_28px_56px_-24px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 font-medium text-mk-mint"><span className="h-[7px] w-[7px] rounded-full bg-mk-mint" />Example church · Giving</span>
                <span className="text-[#A9B8B1]">This year</span>
              </div>
              <div>
                <p className="text-[13px] text-[#A9B8B1]">This month</p>
                <p className="font-display text-[34px] font-semibold leading-tight text-mk-ivory">KES 486,200</p>
              </div>
              <div role="img" aria-label="Giving by month for the last twelve months, rising towards this month" className="flex h-[52px] items-end gap-[5px]">
                {BARS.map((h, i) => (
                  <div key={i} className={`flex-1 rounded-t ${i === BARS.length - 1 ? 'bg-mk-mint' : 'bg-mk-mint/30'}`} style={{ height: `${h}%` }} />
                ))}
              </div>
              <figcaption className="flex items-center justify-between gap-3 border-t border-mk-mint/15 pt-3 text-[13px]">
                <span className="text-[#C9D6D0]">1,248 members</span>
                <span className="font-semibold text-mk-amber">3 payments to match</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* One platform, two homes */}
      <section id="members" className="border-y border-mk-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-14 px-5 py-24 sm:px-8">
          <div className="flex max-w-3xl flex-col gap-4">
            <Eyebrow>One platform, two homes</Eyebrow>
            <Heading>For the people who keep a church running, and the people who keep it alive.</Heading>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5 rounded-[28px] border border-mk-border bg-mk-ivory p-3 pb-10">
              <img src="/landing/treasurer.jpg" alt="A church treasurer working calmly at his desk with a ledger and a laptop" className="h-[300px] w-full rounded-[20px] object-cover object-[50%_40%]" />
              <div className="flex flex-col gap-5 px-7 pt-2">
                <h3 className="font-display text-[28px] font-semibold text-mk-forest">For church leaders</h3>
                <p>The church office, treasurer and pastors work from one place, each seeing what their role needs, for the whole church or their own branch.</p>
                <Ticks items={[
                  'A member register with online registration and approval',
                  'Every Paybill payment matched to its giver, nothing guessed',
                  'Statements, receipts and reports ready to print',
                  'Roles for treasurers, secretaries, pastors and branch admins',
                ]} />
              </div>
            </div>
            <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5 rounded-[28px] bg-mk-forest p-3 pb-10 text-mk-mist">
              <img src="/landing/member-giving.jpg" alt="A smiling church member giving from her phone on a wooden bench" className="h-[300px] w-full rounded-[20px] object-cover object-[50%_30%]" />
              <div className="flex flex-col gap-5 px-7 pt-2">
                <h3 className="font-display text-[28px] font-semibold text-mk-ivory">For every member</h3>
                <p className="text-[#C9D6D0]">One mKanisa account, signed in with your phone. No password to remember.</p>
                <Ticks dark items={[
                  'Your giving across every church you belong to',
                  'A receipt for every gift and a yearly statement',
                  'Register with your church online',
                  'Give in seconds with M-PESA or Airtel Money',
                ]} />
                <Link to="/me" className="inline-flex min-h-11 items-center self-start rounded-xl bg-mk-mint px-5 font-semibold text-mk-forest hover:bg-white">Sign in to My giving</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features">
        <div className="mx-auto flex max-w-6xl flex-col gap-14 px-5 py-28 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex max-w-2xl flex-col gap-4">
              <Eyebrow>Everything in one place</Eyebrow>
              <Heading>What the church office needs, without the clutter.</Heading>
            </div>
            <p className="max-w-sm text-mk-muted">Each part does one job well, and they all speak to each other: a gift, the member who gave it, and the receipt they get.</p>
          </div>
          <div className="flex flex-wrap gap-5">
            {FEATURES.map(([Icon, title, text, tint]) => (
              <div key={title} className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 rounded-[20px] border border-mk-border bg-white p-8 shadow-[0_1px_2px_rgba(16,43,39,0.04)]">
                <span className={`flex h-12 w-12 items-center justify-center rounded-[14px] text-mk-forest ${tint}`}><Icon className="h-[22px] w-[22px]" strokeWidth={1.9} aria-hidden="true" /></span>
                <h3 className="mt-1 text-lg font-semibold text-mk-forest">{title}</h3>
                <p className="text-[15px] text-mk-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How giving works */}
      <section id="how" className="bg-mk-forest text-mk-mist">
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-5 py-28 sm:px-8">
          <div className="flex max-w-2xl flex-col gap-4">
            <Eyebrow dark>How giving works</Eyebrow>
            <Heading dark>Every gift, accounted for. From the phone to the statement.</Heading>
          </div>
          <ol className="flex flex-wrap gap-6">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 border-t border-mk-mint/25 pt-7">
                <span className="font-display text-[40px] font-semibold leading-none text-mk-gold">{i + 1}</span>
                <h3 className="text-xl font-semibold text-mk-ivory">{title}</h3>
                <p className="text-[#C9D6D0]">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Find your church: the live directory */}
      <section id="directory" className="bg-mk-mist">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-28 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex max-w-2xl flex-col gap-4">
              <Eyebrow>Find your church</Eyebrow>
              <Heading>Every church has its own home here.</Heading>
              <p>Its own address, colours and Paybill, with pages to give, register and see your giving. Its data is its own.</p>
            </div>
            <div className="relative w-full sm:w-80">
              <label htmlFor="church-search" className="sr-only">Search churches</label>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mk-muted" aria-hidden="true" />
              <input id="church-search" className="h-12 w-full rounded-xl border border-mk-border bg-white pl-11 pr-4 text-[15px] text-mk-forest outline-none focus:border-mk-green focus:ring-2 focus:ring-mk-mint"
                placeholder="Search by name or place" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
          {churches === null ? <p className="text-mk-muted">Loading…</p>
            : shown.length === 0 ? (
              <p className="rounded-[20px] border border-dashed border-mk-border bg-white p-8 text-center text-mk-muted">
                {churches.length ? 'No church matches your search.' : 'Churches will appear here soon.'}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((c) => (
                  <a key={c.slug} href={c.url} className="group flex items-center gap-4 rounded-[20px] border border-mk-border bg-white p-5 transition hover:border-mk-green/40 hover:shadow-[0_16px_32px_-20px_rgba(16,43,39,0.35)]">
                    {c.logo_mark_url
                      ? <img src={c.logo_mark_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-contain" />
                      : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mk-mist text-mk-green"><Church className="h-5 w-5" aria-hidden="true" /></span>}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-mk-forest">{c.name}</span>
                      <span className="block truncate text-sm text-mk-muted">{c.location || c.url.replace(/^https?:\/\//, '')}</span>
                    </span>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-mk-muted transition group-hover:translate-x-0.5 group-hover:text-mk-green" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-5 py-28 sm:px-8">
          <div className="flex max-w-2xl flex-col gap-4">
            <Eyebrow>Pricing</Eyebrow>
            <Heading>Simple and transparent.</Heading>
          </div>
          <div className="flex flex-wrap items-stretch gap-6">
            <div className="flex min-w-0 flex-[1.3_1_420px] flex-col gap-6 rounded-3xl border border-mk-border bg-white p-10 shadow-[0_2px_4px_rgba(16,43,39,0.04),0_24px_48px_-32px_rgba(16,43,39,0.3)]">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="text-xl font-semibold text-mk-forest">mKanisa Standard</h3>
                <span className="rounded-full bg-mk-amber px-3 py-1 text-[13px] font-semibold text-mk-forest">Every feature</span>
              </div>
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-[56px] font-semibold leading-none text-mk-forest">US$49</span>
                <span className="text-mk-muted">per church, per month · KES 6,500</span>
              </p>
              <ul className="flex flex-wrap gap-x-6 gap-y-3 text-[15px]">
                {['Your own address and public page', 'Members and self-registration', 'Digital giving, receipts and statements', 'Reconciliation and reports', 'Branches, roles and attendance', 'Bulk SMS (credits billed separately)'].map((t) => (
                  <li key={t} className="flex flex-[1_1_220px] gap-2.5"><Check className="mt-1 h-[18px] w-[18px] flex-none text-mk-green" strokeWidth={2.5} aria-hidden="true" />{t}</li>
                ))}
              </ul>
              <p className="border-t border-mk-border pt-5 text-sm text-mk-muted">One-time approval and setup: KES 100,000.</p>
            </div>
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5 rounded-3xl bg-mk-forest p-10 text-mk-mist">
              <h3 className="text-xl font-semibold text-mk-ivory">mKanisa Payments</h3>
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-[56px] font-semibold leading-none text-mk-gold">1%</span>
                <span className="text-[#C9D6D0]">of collections processed</span>
              </p>
              <p className="text-[#C9D6D0]">Optional. Receive tithes, offerings and project gifts straight through mKanisa, settled to your church's account. Payment network charges are agreed and shown up front.</p>
              <a href={join} className="mt-auto inline-flex min-h-11 items-center self-start rounded-xl bg-mk-mint px-5 font-semibold text-mk-forest hover:bg-white">Talk to us</a>
            </div>
          </div>
        </div>
      </section>

      {/* Closing call: the congregation gathering after the service */}
      <section className="relative overflow-hidden bg-mk-forest text-mk-mist">
        <img src="/landing/community.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_45%]" />
        <div className="absolute inset-0" style={{ background: CLOSING_VEIL }} />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-5 py-36 text-center sm:px-8">
          <img src={BRAND.logoMark} alt="" className="h-14 w-14" />
          <h2 className="font-display text-[clamp(36px,4.4vw,56px)] font-semibold leading-[1.08] tracking-[-0.02em] text-mk-ivory">Bring your church home.</h2>
          <p className="max-w-xl text-lg">Tell us about your church. We'll set up its address, bring in your members and connect your Paybill.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <a href={join} className="inline-flex min-h-[52px] items-center rounded-xl bg-mk-mint px-7 font-semibold text-mk-forest hover:bg-white">Bring your church to mKanisa</a>
            <a href="#directory" className="inline-flex min-h-[52px] items-center rounded-xl border border-mk-mist/45 bg-mk-midnight/25 px-6 font-semibold text-mk-ivory hover:bg-mk-midnight/50">Find your church</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-mk-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 pb-10 pt-14 sm:px-8">
          <div className="flex flex-wrap justify-between gap-10">
            <div className="flex flex-[1_1_280px] flex-col gap-3.5">
              <img src={BRAND.logo} alt={BRAND.name} className="h-[26px] w-auto self-start" />
              <p className="max-w-[300px] text-[15px] text-mk-muted">One platform for churches. One account for every member.</p>
            </div>
            <div className="flex flex-wrap gap-x-16 gap-y-8 text-[15px]">
              <div className="flex flex-col gap-2.5">
                <p className="text-[13px] font-semibold text-mk-forest">Product</p>
                <a href="#features" className="hover:text-mk-green">Features</a>
                <a href="#how" className="hover:text-mk-green">How giving works</a>
                <a href="#pricing" className="hover:text-mk-green">Pricing</a>
              </div>
              <div className="flex flex-col gap-2.5">
                <p className="text-[13px] font-semibold text-mk-forest">Members</p>
                <a href="#directory" className="hover:text-mk-green">Find your church</a>
                <Link to="/me" className="hover:text-mk-green">Sign in to My giving</Link>
              </div>
              {contact && (
                <div className="flex flex-col gap-2.5">
                  <p className="text-[13px] font-semibold text-mk-forest">Contact</p>
                  <a href={`mailto:${contact}`} className="hover:text-mk-green">{contact}</a>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-3 border-t border-mk-border pt-6 text-[13px] text-mk-muted">
            <span>© {new Date().getFullYear()} {branding.name} · Nairobi, Kenya</span>
            <Link to="/admin" className="hover:text-mk-green">Platform admin</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
