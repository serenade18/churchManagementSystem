import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { type LucideIcon, ArrowRight, Church, Clock, ExternalLink, Globe, HeartHandshake, Mail, MapPin, Phone, UserPlus, UserRound } from 'lucide-react'
import Logo from '../../components/Logo'
import { request } from '../../lib/api'
import { money } from '../../lib/format'
import { assetUrl, branding } from '../../lib/theme'
import PublicLayout from './PublicLayout'
import type { PublicProject } from '../../types'

const DEFAULT_ABOUT = 'A community of faith, fellowship, and service. Connect with our church, support our mission, and grow together.'

function Action({ to, icon: Icon, title, text, primary = false }: { to: string; icon: LucideIcon; title: string; text: string; primary?: boolean }) {
  return (
    <Link to={to} className={`group flex flex-col items-center rounded-2xl border px-4 py-6 text-center transition ${primary
      ? 'border-transparent bg-primary text-on-primary hover:bg-primary-hover'
      : 'border-slate-200 bg-white text-slate-900 hover:border-brand-200 hover:bg-brand-50'}`}>
      <Icon className={`mb-3 h-7 w-7 ${primary ? '' : 'text-brand-700'}`} />
      <span className="text-lg font-semibold">{title}</span>
      <span className={`mt-1 text-sm ${primary ? 'opacity-85' : 'text-slate-500'}`}>{text}</span>
    </Link>
  )
}

export function ProjectCard({ project }: { project: PublicProject }) {
  const image = assetUrl(project.image_url)
  return (
    <div className="flex gap-4 py-4">
      {image
        ? <img src={image} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover sm:h-28 sm:w-28" />
        : <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:h-28 sm:w-28"><Church className="h-9 w-9" /></span>}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-slate-900">{project.name}</h3>
        {project.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{project.description}</p>}
        {project.percent != null && (
          <>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={project.percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${project.percent}%` }} />
            </div>
            <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs text-slate-500">
              <span><span className="font-semibold text-slate-700">{project.percent}% funded</span> · {money(project.amount_raised)} of {money(project.target_amount)}</span>
            </p>
          </>
        )}
        <Link to={`/give?project=${project.id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
          Give to this project <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

function Detail({ icon: Icon, children, href }: { icon: LucideIcon; children: ReactNode; href?: string }) {
  const body = <><Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" /><span className="min-w-0 break-words">{children}</span></>
  return href
    ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="flex gap-3 text-sm text-slate-700 hover:text-brand-800">{body}</a>
    : <p className="flex gap-3 text-sm text-slate-700">{body}</p>
}

/** The church's public home page: who we are, give, register, projects, when and where we meet. */
export default function ChurchHome() {
  const page = branding.raw || {}
  const cover = assetUrl(page.cover_url)
  const [projects, setProjects] = useState<PublicProject[]>([])
  useEffect(() => { request<PublicProject[]>('/public/projects/', { auth: false }).then(setProjects).catch(() => {}) }, [])

  const services = (page.service_times || '').split('\n').map((s) => s.trim()).filter(Boolean)
  const socials = [['Facebook', page.facebook_url], ['YouTube', page.youtube_url], ['Instagram', page.instagram_url]].filter(([, url]) => url)
  const hasVisit = services.length || page.location || page.contact_phone || page.contact_email || page.website || socials.length

  return (
    <PublicLayout>
      {cover
        ? <img src={cover} alt={`${branding.name}`} className="aspect-[16/9] w-full rounded-2xl object-cover shadow-sm" />
        : (
          <div className="flex aspect-[16/7] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-sidebar via-sidebar to-primary-hover shadow-sm">
            <span className="rounded-2xl bg-white p-4 shadow"><Logo className="h-16 sm:h-20" /></span>
          </div>
        )}

      <section className="mt-6">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Welcome to {branding.name}</h1>
        <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-slate-600 sm:text-lg">{page.about || DEFAULT_ABOUT}</p>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <Action to="/give" icon={HeartHandshake} title="Give Online" text="Tithes & offerings" primary />
        <Action to="/register" icon={UserPlus} title="Register" text="Join our community" />
      </section>
      <Link to="/me" className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
        <UserRound className="h-5 w-5 text-brand-700" />
        <span><span className="font-medium text-slate-900">Already a member?</span> See your giving, receipts and statements.</span>
        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
      </Link>

      {projects.length > 0 && (
        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-xl font-semibold text-slate-900">Support our church projects</h2>
          <div className="divide-y divide-slate-200">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}

      {hasVisit ? (
        <section className="mt-8 grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-2">
          {services.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Service times</h2>
              <div className="space-y-2">{services.map((s) => <Detail key={s} icon={Clock}>{s}</Detail>)}</div>
            </div>
          )}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Visit & contact us</h2>
            <div className="space-y-2">
              {page.location && <Detail icon={MapPin}>{page.location}</Detail>}
              {page.contact_phone && <Detail icon={Phone} href={`tel:${page.contact_phone.replace(/\s/g, '')}`}>{page.contact_phone}</Detail>}
              {page.contact_email && <Detail icon={Mail} href={`mailto:${page.contact_email}`}>{page.contact_email}</Detail>}
              {page.website && <Detail icon={Globe} href={page.website}>{page.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</Detail>}
              {socials.map(([label, url]) => <Detail key={label} icon={ExternalLink} href={url}>{label}</Detail>)}
            </div>
          </div>
        </section>
      ) : null}
    </PublicLayout>
  )
}
