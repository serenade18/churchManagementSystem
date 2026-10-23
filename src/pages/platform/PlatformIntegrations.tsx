import { useState, type FormEvent } from 'react'
import { Alert, Spinner } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useApi } from '../../lib/hooks'
import { Chip, PlatformHeader } from './shared'

interface SettingField {
  key: string
  label: string
  secret: boolean
  choices: string[] | null
  hint: string
  value: string
  is_set: boolean
  source: '' | 'dashboard' | 'env'
}

interface SettingGroup {
  id: string
  title: string
  about: string
  testable: boolean
  fields: SettingField[]
}

interface TestResult { ok: boolean; detail: string }

/** Platform admins: every provider's keys (payments, SMS, email) and the signup keys, saved here instead of in the server's .env. */
export default function PlatformIntegrations() {
  const { data, error, setData } = useApi<SettingGroup[]>('/platform/settings/')
  return (
    <div className="flex flex-col gap-6 font-body text-mk-slate">
      <PlatformHeader title="Integrations" />
      <p className="-mt-3 max-w-3xl text-[15px] text-mk-muted">
        Keys for payments, SMS and email, for every church that doesn't use its own, and the admin signup keys. Saved here they replace the server's
        .env, are stored encrypted, and take effect within a minute. Secrets are never shown again: leave one empty to keep it.
      </p>
      <Alert>{error && errorMessage(error)}</Alert>
      {!data ? (!error && <Spinner className="mx-auto mt-16 h-8 w-8" />)
        : data.map((group) => <GroupCard key={group.id} group={group} onSaved={setData} />)}
    </div>
  )
}

function GroupCard({ group, onSaved }: { group: SettingGroup; onSaved: (groups: SettingGroup[]) => void }) {
  const { user } = useAuth()
  const initial = () => Object.fromEntries(group.fields.map((f) => [f.key, f.secret ? '' : f.value]))
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [busy, setBusy] = useState<'' | 'save' | 'test'>('')
  const [message, setMessage] = useState<TestResult | null>(null)
  const [testTo, setTestTo] = useState(user?.email || '')

  const send = async (body: { values?: Record<string, string>; clear?: string[] }, done: string) => {
    setBusy('save'); setMessage(null)
    try {
      const groups = await api.patch<SettingGroup[]>('/platform/settings/', body)
      onSaved(groups)
      const fresh = groups.find((g) => g.id === group.id)
      if (fresh) setValues(Object.fromEntries(fresh.fields.map((f) => [f.key, f.secret ? '' : f.value])))
      setMessage({ ok: true, detail: done })
    } catch (err) {
      setMessage({ ok: false, detail: errorMessage(err) })
    } finally {
      setBusy('')
    }
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    // Only what changed: an untouched field keeps coming from wherever it comes from now (.env or here).
    const changed = Object.fromEntries(group.fields
      .filter((f) => (f.secret ? values[f.key] !== '' : values[f.key] !== f.value))
      .map((f) => [f.key, values[f.key]]))
    if (!Object.keys(changed).length) { setMessage({ ok: true, detail: 'Nothing changed.' }); return }
    send({ values: changed }, 'Saved.')
  }

  const test = async () => {
    setBusy('test'); setMessage(null)
    try {
      setMessage(await api.post<TestResult>(`/platform/settings/test/${group.id}/`, sendsEmail ? { to: testTo } : {}))
    } catch (err) {
      setMessage({ ok: false, detail: errorMessage(err) })
    } finally {
      setBusy('')
    }
  }

  const sendsEmail = group.id === 'email' || group.id === 'smtp'
  const configured = group.fields.filter((f) => f.is_set).length
  return (
    <section aria-labelledby={`${group.id}-title`} className="flex flex-col gap-5 rounded-[22px] border border-mk-border bg-white p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id={`${group.id}-title`} className="font-display text-xl font-semibold text-mk-forest">{group.title}</h2>
          <p className="text-sm text-mk-muted">{group.about}</p>
        </div>
        <Chip tone={configured === 0 ? 'muted' : configured === group.fields.length ? 'ok' : 'warn'}>
          {configured === 0 ? 'Not set up' : `${configured} of ${group.fields.length} set`}
        </Chip>
      </header>

      <form onSubmit={save} className="flex flex-col gap-5">
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          {group.fields.map((f) => (
            <div key={f.key} className="flex min-w-0 flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={f.key} className="text-sm font-semibold text-mk-forest">{f.label}</label>
                {f.source && (
                  <span className="flex items-center gap-2 text-xs text-mk-muted">
                    {f.source === 'env' ? 'From .env' : 'Saved here'}
                    {f.source === 'dashboard' && (
                      <button type="button" disabled={!!busy} onClick={() => send({ clear: [f.key] }, `${f.label} now comes from .env again.`)}
                        className="font-semibold text-mk-green hover:underline disabled:opacity-60">Use .env</button>
                    )}
                  </span>
                )}
              </div>
              {f.choices ? (
                <select id={f.key} className="input" value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}>
                  {!values[f.key] && <option value="">Not set</option>}
                  {f.choices.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input id={f.key} className="input font-mono text-[14px]" type={f.secret ? 'password' : 'text'}
                  autoComplete={f.secret ? 'new-password' : 'off'} spellCheck={false} value={values[f.key]}
                  placeholder={f.secret ? (f.is_set ? '•••••••• saved, leave empty to keep' : 'Not set') : ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
              )}
              {f.hint && <span className="text-[13px] text-mk-muted">{f.hint}</span>}
            </div>
          ))}
        </div>

        {message && (
          <p role="status" className={`rounded-xl px-4 py-3 text-[15px] ${message.ok ? 'bg-[#E3F1EA] text-mk-green' : 'bg-[#FBEDEA] text-[#B42318]'}`}>
            {message.detail}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-mk-border pt-4">
          <button className="btn-primary" disabled={!!busy}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
          {group.testable && sendsEmail && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-mk-muted">Test to</span>
              <input type="email" className="input h-10 min-h-10 w-56" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
            </label>
          )}
          {group.testable && (
            <>
              <button type="button" className="btn-secondary" disabled={!!busy} onClick={test}>
                {busy === 'test' ? 'Testing…' : sendsEmail ? 'Send a test email' : 'Test connection'}
              </button>
              <span className="text-[13px] text-mk-muted">Tests use the saved keys: save first.</span>
            </>
          )}
        </div>
      </form>
    </section>
  )
}
