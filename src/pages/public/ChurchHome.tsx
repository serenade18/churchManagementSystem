import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { type LucideIcon, ArrowRight, Church, Clock, FileText, Globe, HandHeart, HeartHandshake, Mail, MapPin, Phone, UserPlus } from 'lucide-react'
import Logo from '../../components/Logo'
import { request } from '../../lib/api'
import { BRAND } from '../../brand'
import { money } from '../../lib/format'
import { assetUrl, branding } from '../../lib/theme'
import type { DonationType, PublicProject } from '../../types'

const DEFAULT_ABOUT = 'A community of faith, fellowship, and service. Connect with our church, support our mission, and grow together.'
const DEFAULT_COVER = '/landing/church-cover.jpg'

// The church's own dark colour (Settings > Branding) over its photographs: deepest where the words sit.
const shade = (percent: number) => `color-mix(in srgb, var(--color-sidebar) ${percent}%, transparent)`
const HERO_VEIL = `linear-gradient(180deg, ${shade(60)} 0%, ${shade(0)} 24%), `
  + `linear-gradient(90deg, ${shade(86)} 0%, ${shade(50)} 50%, ${shade(15)} 85%), `
  + `linear-gradient(0deg, ${shade(78)} 0%, ${shade(0)} 50%)`
const JOIN_VEIL = `linear-gradient(180deg, ${shade(76)} 0%, ${shade(88)} 100%)`

const DAY = /^(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?/i
const TIME = /\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)|\d{1,2}[:.]\d{2}/i

/** "Sunday English service 7:00 am" → day, name and time, as far as the church's wording allows. */
export function parseService(line: string) {
  const day = line.match(DAY)?.[0] || ''
  const time = line.match(TIME)?.[0] || ''
  const name = line.replace(day, '').replace(time, '').replace(/^[\s,:–—-]+|[\s,:–—-]+$/g, '').replace(/\s{2,}/g, ' ')
  return { day: day.replace(/\.$/, ''), name: name || line, time }
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`text-[13px] font-semibold uppercase tracking-[0.12em] ${light ? 'text-white/80' : 'text-brand-700'}`}>{children}</p>
}

function Heading({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <h2 className={`font-display text-[clamp(32px,3.6vw,46px)] font-semibold leading-[1.12] tracking-[-0.015em] ${light ? 'text-white' : 'text-mk-forest'}`}>{children}</h2>
}

function ActionCard({ to, icon: Icon, title, text }: { to: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link to={to} className="group flex min-w-0 flex-[1_1_240px] items-center gap-[18px] rounded-[22px] border border-mk-border bg-white px-7 py-6 shadow-[0_2px_4px_rgba(16,43,39,0.05),0_24px_48px_-28px_rgba(16,43,39,0.35)] transition hover:border-brand-200">
      <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon className="h-6 w-6" strokeWidth={1.9} aria-hidden="true" /></span>
      <span className="flex min-w-0 flex-col">
        <span className="font-display text-xl font-semibold text-mk-forest">{title}</span>
        <span className="text-sm text-mk-muted">{text}</span>
      </span>
      <ArrowRight className="ml-auto h-5 w-5 flex-none text-mk-muted transition group-hover:translate-x-0.5 group-hover:text-brand-700" aria-hidden="true" />
    </Link>
  )
}

export function ProjectCard({ project }: { project: PublicProject }) {
  const image = assetUrl(project.image_url)
  return (
    <article className="flex min-w-0 flex-[1_1_320px] flex-col overflow-hidden rounded-3xl border border-mk-border bg-white">
      {image
        ? <img src={image} alt="" className="aspect-[16/10] w-full object-cover" />
        : <span className="flex aspect-[16/10] w-full items-center justify-center bg-brand-50 text-brand-600"><Church className="h-10 w-10" aria-hidden="true" /></span>}
      <div className="flex flex-1 flex-col gap-3 px-6 pb-7 pt-6">
        <h3 className="font-display text-[22px] font-semibold text-mk-forest">{project.name}</h3>
        {project.description && <p className="line-clamp-3 text-[15px] text-mk-muted">{project.description}</p>}
        {project.percent != null && (
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <div className="h-2 overflow-hidden rounded-full bg-mk-mist" role="progressbar" aria-label={`${project.name} funding`} aria-valuenow={project.percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(project.percent, 100)}%` }} />
            </div>
            <p className="flex justify-between gap-3 text-sm">
              <span><span className="font-semibold text-mk-forest">{money(project.amount_raised)}</span> <span className="text-mk-muted">of {money(project.target_amount)}</span></span>
              <span className="font-semibold text-mk-forest">{project.percent}%</span>
            </p>
          </div>
        )}
        <Link to={`/give?project=${project.id}`} className={`inline-flex min-h-11 items-center gap-2 self-start font-semibold text-brand-700 hover:text-brand-800 ${project.percent == null ? 'mt-auto' : ''}`}>
          Give to this project <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

function Contact({ icon: Icon, label, children, href }: { icon: LucideIcon; label: string; children: ReactNode; href?: string }) {
  const body = (
    <>
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" /></span>
      <span className="flex min-w-0 flex-col"><span className="text-[13px] text-mk-muted">{label}</span><span className="break-words font-medium text-mk-forest">{children}</span></span>
    </>
  )
  return href
    ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="flex items-start gap-3.5 hover:opacity-80">{body}</a>
    : <div className="flex items-start gap-3.5">{body}</div>
}

/** The church's public home page: its own colours, photograph and story; give, join, projects, when and where it meets. */
export default function ChurchHome() {
  const page = branding.raw || {}
  const cover = assetUrl(page.cover_url) || DEFAULT_COVER
  const [projects, setProjects] = useState<PublicProject[]>([])
  const [types, setTypes] = useState<DonationType[]>([])
  useEffect(() => {
    request<PublicProject[]>('/public/projects/', { auth: false }).then(setProjects).catch(() => {})
    request<DonationType[]>('/donation-types/', { auth: false }).then(setTypes).catch(() => {})
  }, [])

  const services = (page.service_times || '').split('\n').map((s) => s.trim()).filter(Boolean).map(parseService)
  const sunday = services.filter((s) => !s.day || /^sun/i.test(s.day)).slice(0, 3)
  const paybill = page.paybill
  const codes = types.filter((t) => t.code).slice(0, 6)
  const example = codes.find((t) => /tithe/i.test(t.name)) || codes[0]
  const socials = ([['Facebook', page.facebook_url], ['YouTube', page.youtube_url], ['Instagram', page.instagram_url]] as const).filter(([, url]) => url)
  const tagline = page.tagline && page.tagline !== BRAND.tagline ? page.tagline : ''
  const hasContacts = page.location || page.contact_phone || page.contact_email || page.website || socials.length > 0

  return (
    <div className="bg-mk-ivory font-body text-base leading-relaxed text-mk-slate">
      {/* Hero: the church's own photograph, its name and when it meets */}
      <section id="top" className="relative overflow-hidden bg-sidebar text-white">
        <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_45%]" />
        <div className="absolute inset-0" style={{ background: HERO_VEIL }} />
        <div className="page-width relative flex min-h-[720px] flex-col justify-between gap-14 pb-32 sm:min-h-[800px] sm:pb-36">
          <header className="flex flex-wrap items-center gap-x-10 gap-y-4 pt-7">
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <Logo tile className="h-11 w-11" />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate font-display text-lg font-semibold">{branding.name}</span>
                {page.location && <span className="truncate text-[13px] text-white/80">{page.location}</span>}
              </span>
            </Link>
            <nav aria-label="Main" className="hidden flex-1 flex-wrap justify-end gap-x-8 gap-y-1 text-sm font-medium uppercase tracking-[0.08em] lg:flex">
              <a href="#about" className="hover:text-white/75">About</a>
              {services.length > 0 && <a href="#visit" className="hover:text-white/75">Services</a>}
              {projects.length > 0 && <a href="#projects" className="hover:text-white/75">Projects</a>}
              <a href="#give" className="hover:text-white/75">Give</a>
            </nav>
            <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-3 text-[15px] font-medium lg:ml-0">
              <Link to="/me" className="hover:text-white/75">My giving</Link>
              <Link to="/admin" className="inline-flex min-h-11 items-center rounded-full border border-white/50 px-[18px] font-semibold hover:bg-white/10">Admin login</Link>
              <Link to="/give" className="inline-flex min-h-11 items-center rounded-full bg-white px-[22px] font-semibold text-sidebar hover:bg-white/90">Give</Link>
            </div>
          </header>

          <div className="flex flex-wrap items-end justify-between gap-10">
            <div className="flex min-w-0 flex-[1_1_640px] flex-col gap-6">
              <h1 className="font-display text-[clamp(44px,6.6vw,96px)] font-semibold leading-none tracking-[-0.025em]">
                <span className="font-light">Welcome to</span> {branding.name}
              </h1>
              {tagline && <p className="max-w-[560px] text-[19px] leading-relaxed text-white/90">{tagline}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/give" className="inline-flex min-h-14 items-center gap-2.5 rounded-full bg-white px-7 text-[17px] font-semibold text-sidebar hover:bg-white/90">
                  <HeartHandshake className="h-5 w-5" aria-hidden="true" />Give online
                </Link>
                <a href={services.length ? '#visit' : '#about'} className="inline-flex min-h-14 items-center rounded-full border border-white/55 px-[26px] text-[17px] font-semibold hover:bg-white/10">
                  {services.length ? 'Plan your visit' : 'About us'}
                </a>
              </div>
            </div>

            {sunday.length > 0 && (
              <div className="flex min-w-0 flex-[0_1_330px] flex-col gap-3.5 rounded-[22px] border border-white/20 px-6 py-[22px]" style={{ background: shade(62) }}>
                <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-white/85">
                  <Clock className="h-4 w-4" aria-hidden="true" />{services.some((s) => /^sun/i.test(s.day)) ? 'Join us this Sunday' : 'When we meet'}
                </p>
                {sunday.map((s) => (
                  <div key={`${s.name}${s.time}`} className="flex items-baseline justify-between gap-3 border-b border-white/15 pb-2.5">
                    <span className="text-[15px] text-white/90">{s.name}</span>
                    {s.time && <span className="whitespace-nowrap font-display text-xl font-semibold">{s.time}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* The things people come to do */}
      <section aria-label="Quick actions" className="relative z-10">
        <div className="page-width -mt-[88px] flex flex-wrap gap-5">
          <ActionCard to="/give" icon={HeartHandshake} title="Give" text="M-PESA, Airtel Money or card" />
          <ActionCard to="/register" icon={UserPlus} title="Become a member" text="Register in two minutes" />
          <ActionCard to="/me" icon={FileText} title="My giving" text="Receipts and yearly statements" />
          <ActionCard to="/pray" icon={HandHeart} title="Prayer request" text="We’ll pray with you" />
        </div>
      </section>

      {/* About */}
      <section id="about">
        <div className="page-width flex flex-col gap-5 py-28">
          <Eyebrow>About us</Eyebrow>
          <Heading>{tagline || `About ${branding.name}`}</Heading>
          <p className="max-w-3xl whitespace-pre-line text-lg">{page.about || DEFAULT_ABOUT}</p>
        </div>
      </section>

      {/* Give */}
      <section id="give" className="bg-sidebar text-white">
        <div className="page-width flex flex-wrap items-center gap-14 py-28">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5">
            <Eyebrow light>Give</Eyebrow>
            <Heading light>Give in seconds, from your phone.</Heading>
            <p className="text-lg text-white/85">Tithes, offerings, thanksgiving and project gifts. Every gift gets an SMS receipt, and appears on your yearly statement.</p>
            <div className="mt-1.5 flex flex-wrap gap-3">
              <Link to="/give" className="inline-flex min-h-14 items-center rounded-full bg-white px-7 text-[17px] font-semibold text-sidebar hover:bg-white/90">Give online</Link>
              <Link to="/me" className="inline-flex min-h-14 items-center rounded-full border border-white/45 px-6 font-semibold hover:bg-white/10">See my giving</Link>
            </div>
          </div>

          {paybill && (
            <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5 rounded-[26px] bg-mk-ivory p-8 text-mk-slate shadow-[0_32px_64px_-32px_rgba(0,0,0,0.45)]">
              <p className="text-[15px] font-semibold text-mk-forest">Or pay straight to our Paybill</p>
              <div className="flex flex-wrap gap-4">
                <div className="flex-[1_1_150px] rounded-2xl border border-mk-border bg-white px-[18px] py-4">
                  <p className="text-[13px] text-mk-muted">Paybill number</p>
                  <p className="font-display text-[30px] font-semibold tracking-[0.02em] text-mk-forest">{paybill}</p>
                </div>
                <div className="flex-[1_1_210px] rounded-2xl border border-mk-border bg-white px-[18px] py-4">
                  <p className="text-[13px] text-mk-muted">Account number</p>
                  <p className="font-display text-[22px] font-semibold text-mk-forest">Your phone + code</p>
                  {example && <p className="text-[13px] text-mk-muted">e.g. <span className="font-semibold text-mk-slate">0712345678{example.code}</span> for {example.name.toLowerCase()}</p>}
                </div>
              </div>
              {codes.length > 0 && (
                <div className="flex flex-col">
                  {codes.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 border-b border-mk-border py-2.5 text-[15px] last:border-b-0">
                      <span>{t.name}</span>
                      <span className="min-w-14 rounded-lg bg-brand-50 px-2.5 py-0.5 text-center text-[13px] font-bold tracking-[0.06em] text-brand-700">{t.code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Projects */}
      {projects.length > 0 && (
        <section id="projects">
          <div className="page-width flex flex-col gap-12 py-28">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div className="flex max-w-2xl flex-col gap-4">
                <Eyebrow>Projects</Eyebrow>
                <Heading>Building together.</Heading>
              </div>
              <p className="max-w-sm text-mk-muted">See what we're raising for and how far we've come. Give to any project directly.</p>
            </div>
            <div className="flex flex-wrap gap-6">
              {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Visit us: when we meet, where, how to reach us */}
      {(services.length > 0 || hasContacts) && (
        <section id="visit" className="border-y border-mk-border bg-white">
          <div className="page-width flex flex-wrap gap-14 py-28">
            <div className="flex min-w-0 flex-[1.2_1_460px] flex-col gap-6">
              <Eyebrow>Visit us</Eyebrow>
              <Heading>There's a seat for you.</Heading>
              {services.length > 0 && (
                <div className="flex flex-col">
                  {services.map((s) => (
                    <div key={`${s.day}${s.name}${s.time}`} className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b border-mk-border py-4">
                      {services.some((x) => x.day) && <span className="flex-[0_0_120px] text-sm font-semibold uppercase tracking-[0.06em] text-mk-muted">{s.day}</span>}
                      <span className="flex-[1_1_200px] text-[17px] text-mk-forest">{s.name}</span>
                      {s.time && <span className="font-display text-xl font-semibold text-mk-forest">{s.time}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {hasContacts && (
              <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-5 self-start rounded-[26px] border border-mk-border bg-mk-ivory p-8">
                <p className="font-display text-[22px] font-semibold text-mk-forest">Find us</p>
                {page.location && <Contact icon={MapPin} label="Where">{page.location}</Contact>}
                {page.contact_phone && <Contact icon={Phone} label="Call the office" href={`tel:${page.contact_phone.replace(/\s/g, '')}`}>{page.contact_phone}</Contact>}
                {page.contact_email && <Contact icon={Mail} label="Email" href={`mailto:${page.contact_email}`}>{page.contact_email}</Contact>}
                {page.website && <Contact icon={Globe} label="Website" href={page.website}>{page.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</Contact>}
                {socials.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 border-t border-mk-border pt-4">
                    {socials.map(([label, url]) => (
                      <a key={label} href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-mk-border bg-white px-4 text-sm font-medium text-mk-slate hover:border-brand-200 hover:text-brand-700">{label}</a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Join: register as a member, or sign in to see your giving */}
      <section className="relative overflow-hidden bg-sidebar text-white">
        <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_45%]" />
        <div className="absolute inset-0" style={{ background: JOIN_VEIL }} />
        <div className="page-width relative flex flex-col items-center gap-5 py-32 text-center">
          <h2 className="font-display text-[clamp(36px,4.4vw,56px)] font-semibold leading-[1.08] tracking-[-0.02em]">New here? You're welcome.</h2>
          <p className="max-w-xl text-lg text-white/90">Register as a member in two minutes. Already a member? Sign in with your phone to see your giving, receipts and statements.</p>
          <div className="mt-1.5 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="inline-flex min-h-14 items-center rounded-full bg-white px-7 text-[17px] font-semibold text-sidebar hover:bg-white/90">Become a member</Link>
            <Link to="/me" className="inline-flex min-h-14 items-center rounded-full border border-white/50 bg-black/15 px-6 font-semibold hover:bg-black/25">Sign in to My giving</Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="page-width flex flex-col gap-9 pb-9 pt-14">
          <div className="flex flex-wrap justify-between gap-9">
            <div className="flex min-w-0 items-center gap-3">
              <Logo tile className="h-11 w-11" />
              <span className="flex min-w-0 flex-col leading-snug">
                <span className="font-display text-lg font-semibold text-mk-forest">{branding.name}</span>
                {page.location && <span className="text-sm text-mk-muted">{page.location}</span>}
              </span>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 text-[15px]">
              <Link to="/give" className="hover:text-brand-700">Give</Link>
              <Link to="/register" className="hover:text-brand-700">Become a member</Link>
              <Link to="/me" className="hover:text-brand-700">My giving</Link>
              <Link to="/pray" className="hover:text-brand-700">Prayer request</Link>
              {services.length > 0 && <a href="#visit" className="hover:text-brand-700">Services</a>}
              <Link to="/admin" className="hover:text-brand-700">Church admin</Link>
            </nav>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mk-border pt-5 text-[13px] text-mk-muted">
            <span>© {new Date().getFullYear()} {branding.name}</span>
            {BRAND.poweredBy && (
              <span className="inline-flex items-center gap-2">Powered by <img src={BRAND.logo} alt={BRAND.poweredBy} className="h-4 w-auto" /></span>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
