import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChartColumn, Church, HeartHandshake, MessageSquare, Search, ShieldCheck, UserPlus, UserRound } from 'lucide-react'
import { request } from '../../lib/api'
import { BRAND } from '../../brand'
import { branding } from '../../lib/theme'
import type { DirectoryChurch } from '../../types'

const FEATURES = [
  [HeartHandshake, 'Digital giving', 'M-PESA, Airtel Money and PayPal, receipts by SMS, and every Paybill payment matched to the giver.'],
  [UserPlus, 'Members & registration', 'A registration link for your church, an approval queue and a full member register.'],
  [ChartColumn, 'Reports & reconciliation', 'Dashboards, statements and a one-click sync with your M-PESA statement.'],
  [MessageSquare, 'Bulk SMS', 'Reach branches, groups or the whole church, with delivery reports.'],
  [UserRound, 'One account for every member', 'Members see their giving and receipts across every church they belong to.'],
  [ShieldCheck, 'Your church, your data', 'Each church has its own address, admins and payment accounts.'],
] as const

/** mkanisa.com: what mKanisa is, and the churches on it. */
export default function PlatformHome() {
  const [churches, setChurches] = useState<DirectoryChurch[] | null>(null)
  const [query, setQuery] = useState('')
  useEffect(() => { request<DirectoryChurch[]>('/platform/directory/', { auth: false }).then(setChurches).catch(() => setChurches([])) }, [])
  const contact = branding.raw?.contact_email
  const shown = (churches || []).filter((c) => `${c.name} ${c.location}`.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <img src={BRAND.logo} alt={branding.name} className="h-8 w-auto" />
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <a href="#churches" className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100">Find your church</a>
            <Link to="/me" className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100">My portal</Link>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-br from-sidebar via-sidebar to-primary-hover text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-200">Church management, giving & community</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">The smarter way to manage and connect your church.</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">One platform for churches. One account for every member.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#churches" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-semibold text-slate-900 hover:bg-brand-50">
              Find your church <ArrowRight className="h-4 w-4" />
            </a>
            {contact && (
              <a href={`mailto:${contact}?subject=Bringing our church to mKanisa`}
                className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-5 py-3 font-semibold text-white hover:bg-white/10">
                Bring your church to mKanisa
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-14 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(([Icon, title, text]) => (
          <div key={title}>
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>

      <section id="churches" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Churches on mKanisa</h2>
              <p className="text-slate-600">Give, register or see your church's projects.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input className="input pl-9" placeholder="Search by name or place" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
          {churches === null ? <p className="text-sm text-slate-500">Loading…</p>
            : shown.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{churches.length ? 'No church matches your search.' : 'Churches will appear here soon.'}</p>
              : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {shown.map((c) => (
                    <a key={c.slug} href={c.url} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-200 hover:shadow-sm">
                      {c.logo_mark_url
                        ? <img src={c.logo_mark_url} alt="" className="h-11 w-11 shrink-0 rounded-lg object-contain" />
                        : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Church className="h-5 w-5" /></span>}
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">{c.name}</span>
                        <span className="block truncate text-xs text-slate-500">{c.location || c.url.replace(/^https?:\/\//, '')}</span>
                      </span>
                      <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
                    </a>
                  ))}
                </div>
              )}
        </div>
      </section>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500">
        <span>© {new Date().getFullYear()} {branding.name}</span>
        <span className="flex gap-4">
          {contact && <a href={`mailto:${contact}`} className="hover:text-slate-700">Contact</a>}
          <Link to="/admin" className="hover:text-slate-700">Platform admin</Link>
        </span>
      </footer>
    </div>
  )
}
