import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Plus, Send, Trash2 } from 'lucide-react'
import { Alert, Spinner } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { useApi } from '../../lib/hooks'
import type { ChurchRegistration, RegistrationsPage } from '../../types'
import { Chip, Picker, PlatformHeader, SearchBox, TableSection, Tabs, Tile, number, pillButton, td, th, type Tone } from './shared'

type Status = 'all' | 'waiting' | 'opened' | 'expired'
type Period = 'month' | 'quarter' | 'all'
const STATUS: Record<ChurchRegistration['status'], [string, Tone]> = { waiting: ['Waiting on owner', 'warn'], opened: ['Open', 'ok'], expired: ['Expired', 'muted'] }

const when = (iso: string) => {
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  const time = d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false })
  return today ? `Today, ${time}` : `${d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}, ${time}`
}

function progress(r: ChurchRegistration) {
  if (r.status === 'opened') return r.minutes_to_open === null ? 'Opened' : `Opened in ${r.minutes_to_open < 60 ? `${r.minutes_to_open} min` : `${Math.round(r.minutes_to_open / 60)} h`}`
  if (r.status === 'expired') return 'Never confirmed'
  const n = r.owner?.codes_sent || 0
  return `${n} code${n === 1 ? '' : 's'} sent`
}

const STEP: Record<ChurchRegistration['log'][number]['what'], (by: string | null) => string> = {
  registered: () => 'Registered at mkanisa.com/start',
  code_sent: () => 'Code sent by SMS',
  code_resent: (by) => (by ? `Code sent again by ${by}` : 'Code sent again (owner asked)'),
  code_failed: () => "The code couldn't be sent",
  opened: () => 'Owner confirmed; the church opened',
}

/** Platform admins: churches that registered themselves, and getting the stuck ones open. */
export default function PlatformRegistrations() {
  const [status, setStatus] = useState<Status>('all')
  const [period, setPeriod] = useState<Period>('month')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  useEffect(() => { const t = setTimeout(() => setQuery(q), 300); return () => clearTimeout(t) }, [q])
  const { data, error, reload } = useApi<RegistrationsPage>('/platform/registrations/', { status, period, q: query })
  const [selected, setSelected] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const rows = data?.results || []
  const current = rows.find((r) => r.id === selected) || rows.find((r) => r.status === 'waiting') || rows[0]

  const act = async (run: () => Promise<string>) => {
    setBusy(true); setNotice('')
    try { setNotice(await run()); reload(); window.dispatchEvent(new Event('platform:registrations-changed')) } catch (e) { setNotice(errorMessage(e)) } finally { setBusy(false) }
  }
  const resend = (r: ChurchRegistration) => act(async () => (await api.post<{ detail: string }>(`/platform/registrations/${r.id}/resend/`)).detail)
  const discard = (r: ChurchRegistration) => {
    if (!window.confirm(`Discard ${r.name}'s registration? Its owner's unused account goes too.`)) return
    act(async () => { await api.del(`/platform/registrations/${r.id}/`); setSelected(null); return `${r.name}'s registration was discarded.` })
  }

  const action = (r: ChurchRegistration) => (r.status === 'opened'
    ? <a href={r.url} target="_blank" rel="noreferrer" className={pillButton}><ExternalLink className="h-4 w-4" aria-hidden="true" />Visit</a>
    : r.status === 'waiting'
      ? <button type="button" className={pillButton} disabled={busy} onClick={() => resend(r)}><Send className="h-4 w-4" aria-hidden="true" />Resend</button>
      : <button type="button" className={pillButton} disabled={busy} onClick={() => discard(r)}><Trash2 className="h-4 w-4" aria-hidden="true" />Discard</button>)

  return (
    <div className="flex flex-col gap-6 font-body text-mk-slate">
      <PlatformHeader title="Registrations">
        <Link to="/platform/churches?new=1" className="inline-flex h-11 items-center gap-2 rounded-full bg-mk-green px-5 text-[15px] font-semibold text-white hover:bg-mk-forest">
          <Plus className="h-[18px] w-[18px]" aria-hidden="true" />Add a church
        </Link>
      </PlatformHeader>
      <Alert>{error && errorMessage(error)}</Alert>
      {notice && <p role="status" className="rounded-xl border border-mk-border bg-white px-4 py-3 text-[15px] text-mk-forest">{notice}</p>}
      {!data ? (!error && <Spinner className="mx-auto mt-16 h-8 w-8" />) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
            <Tile label="Registered this month" value={number(data.stats.registered_this_month)}>at mkanisa.com/start</Tile>
            <Tile label="Opened" value={`${data.stats.opened_this_month} of ${data.stats.registered_this_month}`}>the owner confirmed their phone</Tile>
            <Tile label="Time to open" value={data.stats.minutes_to_open === null ? '—' : `${data.stats.minutes_to_open} min`}>typical, from registering</Tile>
            <Tile label="Waiting on owner" value={number(data.stats.waiting)}>
              {data.stats.oldest_waiting_days === null ? 'nobody waiting' : `oldest: ${data.stats.oldest_waiting_days ? `${data.stats.oldest_waiting_days} days` : 'today'}`}
            </Tile>
          </div>

          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-[1_1_640px]">
              <TableSection id="reg-title" title="Church registrations" subtitle="Churches that signed themselves up at mkanisa.com/start"
                controls={<>
                  <SearchBox label="Search church or owner" value={q} onChange={setQ} />
                  <Picker label="Period" value={period} onChange={setPeriod} options={[['month', 'This month'], ['quarter', 'Last 3 months'], ['all', 'All time']]} />
                </>}
                footer={<span>Registrations nobody confirms in 7 days expire.</span>}>
                <Tabs label="Registrations" value={status} onChange={setStatus} tabs={[
                  ['all', 'All', null], ['waiting', 'Waiting on owner', data.counts.waiting], ['opened', 'Opened', data.counts.opened], ['expired', 'Expired', data.counts.expired]]} />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-[15px]">
                    <thead className="bg-mk-ivory"><tr><th className={`${th} pl-6`}>Church</th><th className={th}>Owner</th><th className={th}>Registered</th><th className={th}>Status</th><th className={`${th} pr-6`}><span className="sr-only">Action</span></th></tr></thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} aria-selected={current?.id === r.id} onClick={() => setSelected(r.id)}
                          className={`cursor-pointer border-t border-mk-mist ${current?.id === r.id ? 'bg-[#F3F8F5] shadow-[inset_3px_0_0_var(--color-mk-green)]' : 'hover:bg-mk-ivory'}`}>
                          <td className={`${td} pl-6`}><span className="flex flex-col"><span className="font-semibold text-mk-forest">{r.name}</span><span className="text-[13px] text-mk-muted">{r.location || r.domain}</span></span></td>
                          <td className={td}><span className="flex flex-col"><span className="whitespace-nowrap font-semibold text-mk-forest">{r.owner?.name || '—'}</span><span className="text-[13px] text-mk-muted">{r.owner?.phone}</span></span></td>
                          <td className={td}><span className="flex flex-col"><span className="whitespace-nowrap font-semibold text-mk-forest">{when(r.created_at)}</span><span className="text-[13px] text-mk-muted">{progress(r)}</span></span></td>
                          <td className={td}><Chip tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Chip></td>
                          <td className={`${td} pr-6 text-right`} onClick={(e) => e.stopPropagation()}>{action(r)}</td>
                        </tr>
                      ))}
                      {!rows.length && <tr><td colSpan={5} className="px-6 py-8 text-center text-mk-muted">No registrations here.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </TableSection>
            </div>
            {current && <Detail r={current} busy={busy} onResend={() => resend(current)} onDiscard={() => discard(current)} />}
          </div>
        </>
      )}
    </div>
  )
}

function Detail({ r, busy, onResend, onDiscard }: { r: ChurchRegistration; busy: boolean; onResend: () => void; onDiscard: () => void }) {
  const steps = r.log.map((e) => ({ at: when(e.at), text: STEP[e.what]?.(e.by) || e.what, now: false }))
  if (r.status === 'waiting') steps.push({ at: 'Waiting', text: 'Owner enters the code; the church opens', now: true })
  return (
    <aside aria-labelledby="regd-title" className="flex min-w-0 flex-[0_1_320px] flex-col gap-[18px] rounded-[22px] border border-mk-border bg-white p-6">
      <div className="flex flex-col gap-1.5">
        <span className="self-start"><Chip tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Chip></span>
        <h2 id="regd-title" className="font-display text-xl font-semibold text-mk-forest">{r.name}</h2>
        <span className="font-mono text-[13px] text-mk-muted">{r.domain}</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-mk-muted">Owner</dt><dd className="font-semibold text-mk-forest">{r.owner?.name || '—'}</dd>
        <dt className="text-mk-muted">Phone</dt><dd className="text-mk-forest">{r.owner?.phone || '—'}</dd>
        <dt className="text-mk-muted">Email</dt><dd className="break-all text-mk-forest">{r.owner?.email || '—'}</dd>
        {r.location && <><dt className="text-mk-muted">Location</dt><dd className="text-mk-forest">{r.location}</dd></>}
      </dl>
      <div className="border-t border-mk-mist pt-3.5">
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-mk-muted">What has happened</p>
        <ol className="flex flex-col">
          {steps.map((s, i) => (
            <li key={i} className="relative flex gap-3.5 pb-3.5">
              {i < steps.length - 1 && <span className="absolute bottom-[-6px] left-[5px] top-4 w-0.5 bg-mk-mist" aria-hidden="true" />}
              <span className={`relative mt-[5px] h-3 w-3 flex-none rounded-full ring-[3px] ring-white ${s.now ? 'bg-mk-gold' : 'bg-mk-green'}`} aria-hidden="true" />
              <span className="flex flex-col"><span className="text-[15px] font-semibold text-mk-forest">{s.text}</span><span className="text-[13px] text-mk-muted">{s.at}</span></span>
            </li>
          ))}
        </ol>
      </div>
      {r.status === 'waiting' && (
        <div className="flex flex-col gap-2.5">
          <button type="button" disabled={busy} onClick={onResend} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-mk-green px-5 font-semibold text-white hover:bg-mk-forest disabled:opacity-60">
            <Send className="h-4 w-4" aria-hidden="true" />Resend code
          </button>
          <p className="text-[13px] text-mk-muted">Still stuck? Call the owner, then add the church yourself from Churches and discard this registration.</p>
        </div>
      )}
      {r.status !== 'opened' && (
        <button type="button" disabled={busy} onClick={onDiscard} className={`${pillButton} h-11 justify-center`}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />Discard registration
        </button>
      )}
      {r.status === 'opened' && <a href={`${r.url}/admin`} target="_blank" rel="noreferrer" className={`${pillButton} h-11 justify-center`}><ExternalLink className="h-4 w-4" aria-hidden="true" />Open their admin</a>}
    </aside>
  )
}
