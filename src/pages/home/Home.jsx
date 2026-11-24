import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, MapPin, Menu, X } from 'lucide-react'
import { request } from '../../lib/api'
import { assetUrl, branding } from '../../lib/theme'
import { BRAND } from '../../brand'
import { HOME } from './content'

// The parish's public homepage: Presbyterian blue, the PCEA crest, and the parish's own words
// (content.js) with live figures from its records. Its own fonts load only on this page.
const FONTS = 'https://fonts.googleapis.com/css2?family=Young+Serif&family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap'
const display = "font-['Young_Serif',Georgia,'Times_New_Roman',serif] font-normal"
const mono = "font-['IBM_Plex_Mono',ui-monospace,Menlo,monospace]"
const eyebrow = 'text-[13px] font-bold uppercase tracking-[0.14em]'
const band = 'mx-auto max-w-[1200px] px-5 sm:px-10'

const NAV = [['#about', 'About us'], ['#services', 'Services'], ['#fellowships', 'Fellowships'], ['#events', 'Events'], ['#congregations', 'Congregations'], ['#contact', 'Contact']]

const kes = (n) => `KES ${Number(n || 0) >= 1e6 ? `${(Number(n) / 1e6).toFixed(1).replace(/\.0$/, '')}M` : Math.round(Number(n || 0)).toLocaleString('en-KE')}`
const groupDigits = (n) => String(n).replace(/(\d{3})(?=\d)/g, '$1 ')

function Crest({ size = 'h-16 w-16' }) {
  return (
    <span className={`flex ${size} flex-none items-center justify-center rounded-[24%] bg-white`}>
      <img src={branding.logoMark || BRAND.logo} alt={`${branding.name} logo`} className="h-[80%] w-[80%] object-contain" />
    </span>
  )
}

function Button({ to, href, children, tone = 'navy', arrow = true }) {
  const tones = {
    gold: 'bg-[#F2C46B] text-[#0C1D38] border-[#F2C46B] hover:bg-[#f5d18a]',
    navy: 'bg-[#12284A] text-white border-[#12284A] hover:bg-[#0C1D38]',
    ghostDark: 'border-white/45 text-white hover:bg-white/10',
    ghost: 'border-[#D8DEE3] text-[#12284A] hover:bg-[#EEF1EF]',
  }
  const cls = `inline-flex min-h-[50px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full border-[1.5px] px-6 text-base font-bold transition ${tones[tone]}`
  const body = <>{children}{arrow && <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />}</>
  return to ? <Link to={to} className={cls}>{body}</Link> : <a href={href} className={cls}>{body}</a>
}

function Heading({ children, light = false, className = '' }) {
  return <h2 className={`${display} text-[32px] leading-[1.12] tracking-[-0.01em] text-balance sm:text-[44px] ${light ? 'text-white' : 'text-[#13233B]'} ${className}`}>{children}</h2>
}

function upcoming(events) {
  const today = new Date().toISOString().slice(0, 10)
  return events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4)
}

export default function Home() {
  const [menu, setMenu] = useState(false)
  const [codes, setCodes] = useState([])
  const [projects, setProjects] = useState([])
  const contact = branding.raw?.contact || {}
  const cover = assetUrl(branding.raw?.cover_url)
  const paybill = contact.paybill || BRAND.paybill
  const name = branding.name

  useEffect(() => {
    const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS })
    document.head.appendChild(link)
    document.title = `${name} · Presbyterian Church of East Africa`
    request('/donation-types/', { auth: false }).then(setCodes).catch(() => {})
    request('/public/projects/', { auth: false }).then(setProjects).catch(() => {})
    return () => link.remove()
  }, [name])

  // The project with a target that has the most still to raise: the parish's main appeal.
  const appeal = projects.filter((p) => p.status === 'ongoing' && Number(p.target_amount) > 0)
    .sort((a, b) => (b.target_amount - b.amount_raised) - (a.target_amount - a.amount_raised))[0]
  const appealShare = appeal ? Math.min(100, Math.round((Number(appeal.amount_raised) / Number(appeal.target_amount)) * 100)) : 0
  const appealCode = appeal && codes.find((c) => c.project === appeal.id)?.code
  // The default type (the one a bare Paybill payment lands in) first.
  const shownCodes = codes.filter((c) => c.code).sort((a, b) => b.is_default - a.is_default).slice(0, 5)
  const exampleCode = shownCodes[0]?.code || 'TITHE'
  const events = upcoming(HOME.events)

  return (
    <div className="bg-[#EEF1EF] font-['Hanken_Grotesk','Segoe_UI',system-ui,sans-serif] text-base leading-normal text-[#3A4658]">
      {/* Hero: who we are, with the parish's own photograph */}
      <section id="about" className="bg-[radial-gradient(120%_90%_at_78%_30%,#1B3A68_0%,#12284A_45%,#0C1D38_100%)] text-white">
        <div className={band}>
          <header className="flex items-center gap-6 py-5 lg:gap-10 lg:py-[26px]">
            <Link to="/" className="flex min-w-0 items-center gap-3.5 text-white">
              <Crest size="h-12 w-12 sm:h-16 sm:w-16" />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className={`${display} truncate text-lg sm:text-[21px]`}>{name}</span>
                <span className="hidden text-xs uppercase tracking-[0.12em] text-[#F2C46B] sm:block">Presbyterian Church of East Africa</span>
              </span>
            </Link>
            <nav aria-label="Main" className="ml-auto hidden gap-7 lg:flex">
              {NAV.map(([href, label]) => <a key={href} href={href} className="whitespace-nowrap text-[15px] font-semibold text-white/80 hover:text-white">{label}</a>)}
            </nav>
            <Link to="/give" className="ml-auto hidden min-h-11 items-center rounded-full bg-[#F2C46B] px-5 text-[15px] font-bold text-[#0C1D38] hover:bg-[#f5d18a] sm:inline-flex lg:ml-0">Give</Link>
            <button type="button" className="ml-auto rounded-lg p-2 text-white sm:ml-0 lg:hidden" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              {menu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </header>
          {menu && (
            <nav aria-label="Main" className="mb-4 flex flex-col rounded-xl bg-white/10 p-2 lg:hidden">
              {NAV.map(([href, label]) => <a key={href} href={href} onClick={() => setMenu(false)} className="rounded-lg px-3 py-2.5 font-semibold text-white hover:bg-white/10">{label}</a>)}
              <Link to="/give" className="rounded-lg px-3 py-2.5 font-semibold text-[#F2C46B] hover:bg-white/10">Give</Link>
            </nav>
          )}
          <div className="grid items-end gap-10 pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pt-10">
            <div className="flex flex-col gap-6 pb-4 lg:gap-7 lg:pb-[170px]">
              <p className={`${eyebrow} text-[#F2C46B]`}>{HOME.motto} · {HOME.mottoMeaning}</p>
              <h1 className={`${display} text-[42px] leading-[1.04] tracking-[-0.02em] text-balance sm:text-[60px] lg:text-[76px]`}>{HOME.headline}</h1>
              <p className="max-w-[34em] text-[17px] leading-relaxed text-white/85 sm:text-[19px]">{HOME.intro}</p>
              <div className="flex flex-wrap gap-3.5">
                <Button href="#services" tone="gold">Plan your first visit</Button>
                <Button to="/give" tone="ghostDark" arrow={false}>Give online</Button>
              </div>
            </div>
            <div className="pb-24 lg:pb-[120px]">
              <div className="rounded-t-[240px] rounded-b-lg bg-white/[0.08] p-2.5 shadow-[inset_0_0_0_1px_rgba(242,196,107,0.35)]">
                {cover ? (
                  <img src={cover} alt={`${name}`} className="aspect-[9/10] w-full rounded-t-[230px] rounded-b object-cover" />
                ) : (
                  // No photograph uploaded yet: the crest, large, in the arch
                  <div className="flex aspect-[9/10] w-full items-center justify-center rounded-t-[230px] rounded-b bg-[radial-gradient(70%_60%_at_50%_45%,#24497F_0%,#12284A_70%)]">
                    <span className="flex h-[46%] w-[46%] items-center justify-center rounded-[22%] bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]">
                      <img src={branding.logoMark || BRAND.logo} alt="" className="h-[80%] w-[80%] object-contain" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sunday services, lifted over the hero's edge */}
      <section id="services" className="scroll-mt-4">
        <div className={band}>
          <div className="relative -top-16 -mb-16 rounded-md bg-white shadow-[0_30px_60px_-30px_rgba(12,29,56,0.45)] lg:-top-24 lg:-mb-24">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[#D8DEE3] px-5 py-4 sm:px-[30px]">
              <span className="flex items-center gap-2.5 font-bold text-[#13233B]"><Clock className="h-5 w-5 text-[#C9561F]" aria-hidden="true" />{HOME.sunday.title}</span>
              <span className="text-sm text-[#5E6878]">{HOME.sunday.note}</span>
            </div>
            <div className="grid divide-y divide-[#D8DEE3] md:grid-cols-3 md:divide-x md:divide-y-0">
              {HOME.sunday.services.map((s) => (
                <div key={s.time} className="flex min-w-0 flex-col gap-2 px-5 py-6 sm:px-[30px] sm:py-7">
                  <span className="flex items-baseline gap-2.5"><span className={`${display} text-[40px] leading-none text-[#12284A] sm:text-[44px]`}>{s.time}</span><span className="text-sm font-bold text-[#5E6878]">am</span></span>
                  <span className="text-[17px] font-bold text-[#13233B]">{s.name} <span className="font-semibold text-[#C9561F]">· {s.language}</span></span>
                  <span className="text-[15px] text-[#5E6878]">{s.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* From the Parish Minister */}
      <section className={`${band} grid items-center gap-10 py-16 lg:grid-cols-[380px_1fr] lg:gap-[72px] lg:pb-24 lg:pt-[72px]`}>
        <div aria-hidden="true" className={`${display} mx-auto flex aspect-[4/5] w-full max-w-[280px] items-center justify-center rounded-t-[190px] rounded-b-md bg-[linear-gradient(160deg,#2A5592,#0C1D38)] text-[88px] text-[#F2C46B] lg:max-w-none`}>{HOME.minister.initials}</div>
        <div className="flex flex-col gap-6">
          <p className={`${eyebrow} text-[#C9561F]`}>From the Parish Minister</p>
          <blockquote className={`${display} text-[26px] leading-[1.3] text-[#13233B] text-pretty sm:text-[34px]`}>“{HOME.minister.quote}”</blockquote>
          <p className="max-w-[36em] text-[17px] leading-[1.7]">{HOME.minister.story}</p>
          <p className="flex items-center gap-4"><span className="h-0.5 w-11 bg-[#E8952F]" aria-hidden="true" /><span><strong className="text-[#13233B]">{HOME.minister.name}</strong><span className="text-[#5E6878]"> · {HOME.minister.role}</span></span></p>
        </div>
      </section>

      {/* Where we come from */}
      <section className="bg-white">
        <div className={`${band} flex flex-col gap-10 py-16 lg:py-24`}>
          <div className="flex flex-col gap-3.5">
            <p className={`${eyebrow} text-[#C9561F]`}>Where we come from</p>
            <Heading>The bush is still burning.</Heading>
          </div>
          <div className="grid border-y border-[#D8DEE3] md:grid-cols-3">
            {HOME.history.map((h, i) => (
              <div key={h.year} className={`flex flex-col gap-2 px-1 py-7 md:px-8 ${i ? 'border-t border-[#D8DEE3] md:border-l md:border-t-0' : ''}`}>
                <span className={`${display} text-[54px] leading-none text-[#12284A]`}>{h.year}</span>
                <span className="text-[15px] leading-relaxed">{h.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fellowships */}
      <section id="fellowships" className={`${band} flex flex-col gap-10 py-16 lg:py-24`}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex max-w-[640px] flex-col gap-3.5"><p className={`${eyebrow} text-[#C9561F]`}>Fellowships</p><Heading>Nobody here worships alone.</Heading></div>
          <p className="max-w-[26em] text-[17px] leading-relaxed">Every member belongs to a Jumuia near home, and most to one of the fellowships below.</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-[18px]">
          {HOME.fellowships.map((g) => (
            <li key={g.name} className="flex flex-col gap-2.5 rounded-md bg-white p-7">
              <span className={`${display} text-[26px] text-[#13233B]`}>{g.name}</span>
              <span className="leading-relaxed">{g.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Giving: the Paybill, its codes, and the parish's main appeal */}
      <section id="give" className="bg-[#12284A] text-white">
        <div className={`${band} grid gap-12 py-16 lg:grid-cols-2 lg:gap-[72px] lg:py-24`}>
          <div className="flex flex-col gap-6">
            <p className={`${eyebrow} text-[#F2C46B]`}>Giving</p>
            <Heading light>Bring the whole tithe into the storehouse.</Heading>
            <p className="text-sm tracking-[0.04em] text-white/60">MALACHI 3:10</p>
            <ol className="flex flex-col gap-4">
              {[
                'Open M-PESA and choose Lipa na M-PESA, then Pay Bill.',
                <>Business number <strong className={`${mono} text-white`}>{groupDigits(paybill)}</strong>.</>,
                <>Account: your member number or phone number, then a code, e.g. <strong className={`${mono} text-white`}>M0142 {exampleCode}</strong> or <strong className={`${mono} text-white`}>0712345678 {exampleCode}</strong>.</>,
                // Safaricom usually hides the payer's number, so the account is the reliable way to reach them.
                'The receipt SMS goes to the phone number you typed, or to the one the parish has for your member number. Type one of them to be sure it reaches you.',
              ].map((step, i) => (
                <li key={i} className="flex items-baseline gap-4"><span className={`${display} min-w-[22px] text-[26px] text-[#F2C46B]`}>{i + 1}</span><span className="text-[17px] leading-normal text-white/90">{step}</span></li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-3.5"><Button to="/give" tone="gold">Give online</Button><Button to="/me" tone="ghostDark" arrow={false}>My giving statement</Button></div>
          </div>
          <div className="flex flex-col gap-6 self-start">
            {shownCodes.length > 0 && (
              <div className="rounded-md bg-[#0C1D38] px-6 py-6 sm:px-8">
                <p className="mb-1.5 font-bold">Paybill account codes</p>
                <table className="w-full border-collapse">
                  <tbody>
                    {shownCodes.map((c) => (
                      <tr key={c.id}>
                        <td className={`${mono} border-t border-white/15 py-3.5 pr-6 text-[17px] font-semibold tracking-[0.04em] text-[#F2C46B]`}>{c.code}</td>
                        <td className="border-t border-white/15 py-3.5 text-white/85">{c.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {appeal && (
              <div className="flex flex-col gap-3.5 rounded-md bg-[#0C1D38] px-6 py-7 sm:px-8">
                <div className="flex items-baseline justify-between gap-4"><span className={`${display} text-2xl`}>{appeal.name}</span><span className={`${display} text-[30px] text-[#F2C46B]`}>{appealShare}%</span></div>
                <div className="h-2.5 rounded-full bg-white/[0.12]" role="progressbar" aria-label={`${appeal.name} raised`} aria-valuenow={appealShare} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#C9561F,#F2C46B)]" style={{ width: `${appealShare}%` }} />
                </div>
                <span className="text-[15px] text-white/80">
                  {kes(appeal.amount_raised)} raised of {kes(appeal.target_amount).replace('KES ', '')}
                  {appealCode && <> · Give with the code <strong className={`${mono} text-[#F2C46B]`}>{appealCode}</strong></>}
                </span>
                {appeal.description && <p className="text-[15px] leading-relaxed text-white/70">{appeal.description}</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Coming up */}
      {events.length > 0 && (
        <section id="events" className="bg-white">
          <div className={`${band} grid gap-10 py-16 lg:grid-cols-[340px_1fr] lg:gap-[72px] lg:py-24`}>
            <div className="flex flex-col gap-4"><p className={`${eyebrow} text-[#C9561F]`}>In the parish</p><Heading>Coming up</Heading>
              <p className="text-[17px] leading-relaxed">Announcements are read at every service and sent by SMS to members the Friday before.</p></div>
            <ul className="border-b border-[#D8DEE3]">
              {events.map((e) => {
                const d = new Date(`${e.date}T00:00:00`)
                return (
                  <li key={e.date + e.title} className="grid grid-cols-[64px_1fr] items-center gap-5 border-t border-[#D8DEE3] py-6 sm:grid-cols-[96px_1fr] sm:gap-7">
                    <span className="flex flex-col items-center leading-none">
                      <span className={`${display} text-4xl text-[#12284A] sm:text-[46px]`}>{String(d.getDate()).padStart(2, '0')}</span>
                      <span className={`${eyebrow} mt-1.5 text-xs text-[#C9561F]`}>{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
                    </span>
                    <span className="flex min-w-0 flex-col gap-1"><span className={`${display} text-xl text-[#13233B] sm:text-[25px]`}>{e.title}</span><span className="text-[#5E6878]">{e.detail}</span></span>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Congregations */}
      <section id="congregations" className={`${band} flex flex-col gap-10 py-16 lg:py-24`}>
        <div className="flex flex-col gap-3.5"><p className={`${eyebrow} text-[#C9561F]`}>Congregations</p><Heading>One parish, {HOME.congregations.length === 4 ? 'four' : HOME.congregations.length} places to worship</Heading></div>
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {HOME.congregations.map((c, i) => (
            <li key={c.name} className={`flex flex-col gap-2.5 border-t-[3px] pt-6 ${i === 0 ? 'border-[#12284A]' : 'border-[#D8DEE3]'}`}>
              <span className={`${eyebrow} text-xs ${i === 0 ? 'text-[#C9561F]' : 'text-[#5E6878]'}`}>{c.kind}</span>
              <span className={`${display} text-[30px] text-[#13233B]`}>{c.name}</span>
              <span className="flex gap-2 text-[15px] leading-normal"><MapPin className="mt-0.5 h-[18px] w-[18px] flex-none text-[#5E6878]" aria-hidden="true" />{c.place}</span>
              <span className="flex gap-2 text-[15px]"><Clock className="mt-0.5 h-[18px] w-[18px] flex-none text-[#5E6878]" aria-hidden="true" />Sundays {c.times}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* New here */}
      <section className={`${band} pb-16 lg:pb-24`}>
        <div className="grid items-center gap-8 rounded-md border border-[#D8DEE3] bg-white px-6 py-10 sm:px-14 sm:py-14 lg:grid-cols-[1fr_auto] lg:gap-12">
          <div className="flex flex-col gap-3.5"><Heading className="sm:text-[40px]">New here?</Heading><p className="max-w-[38em] text-[17px] leading-relaxed">{HOME.join}</p></div>
          <div className="flex flex-col gap-3"><Button href="#services">Visit this Sunday</Button><Button to="/me" tone="ghost" arrow={false}>Members: My giving</Button></div>
        </div>
      </section>

      <footer id="contact" className="bg-[#0C1D38] text-white/80">
        <div className={`${band} flex flex-col gap-10 pb-10 pt-16 text-[15px]`}>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="flex flex-col gap-4">
              <span className="flex items-center gap-3.5 text-white"><Crest /><span className={`${display} text-[21px]`}>{name}</span></span>
              <span className="max-w-[22em] leading-relaxed">A parish of the Presbyterian Church of East Africa, in the {HOME.presbytery}.</span>
            </div>
            <div className="flex flex-col gap-2.5"><strong className="text-white">Visit</strong>{contact.address ? <span>{contact.address}</span> : <span>{HOME.congregations[0]?.place}</span>}</div>
            <div className="flex flex-col gap-2.5"><strong className="text-white">Parish office</strong>
              {contact.phone && <span>{contact.phone}</span>}
              {contact.email && <span className="break-all">{contact.email}</span>}
              {!contact.phone && !contact.email && <span>Ask at any service.</span>}
            </div>
            <div className="flex flex-col gap-2.5"><strong className="text-white">For members</strong>
              <Link to="/give" className="underline hover:text-white">Give</Link><Link to="/me" className="underline hover:text-white">My giving</Link><Link to="/login" className="underline hover:text-white">Staff sign in</Link>
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-4 border-t border-white/[0.12] pt-6 text-sm">
            <span>© {new Date().getFullYear()} {name}</span><span className={`${display} italic text-[#F2C46B]`}>{HOME.motto}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
