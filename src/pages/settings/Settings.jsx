import { useState } from 'react'
import BrandingSettings from '../../components/BrandingSettings'
import { Alert, Field, PageHeader, PasswordInput } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useForm } from '../../lib/useForm'

export default function SettingsPage() {
  const { user } = useAuth()
  const [done, setDone] = useState('')
  const { values, set, setValues, errors, error, busy, submit } = useForm({ current_password: '', new_password: '', confirm: '' })
  const [mismatch, setMismatch] = useState('')

  const save = async (e) => {
    e.preventDefault()
    setDone('')
    if (values.new_password !== values.confirm) { setMismatch('Passwords do not match.'); return }
    setMismatch('')
    const ok = await submit(({ current_password, new_password }) => api.post('/auth/change-password/', { current_password, new_password })).catch(() => null)
    if (ok) { setDone('Your password has been updated.'); setValues({ current_password: '', new_password: '', confirm: '' }) }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle={`Signed in as ${user.username}`} />
      <div className="mb-6"><BrandingSettings /></div>
      <div className="card max-w-md p-6">
        <h2 className="mb-4 font-semibold">Change password</h2>
        <Alert tone="green">{done}</Alert>
        <Alert>{error}</Alert>
        <form onSubmit={save} className="space-y-4">
          <Field label="Current password" error={errors.current_password}><PasswordInput autoComplete="current-password" required value={values.current_password} onChange={set('current_password')} /></Field>
          <Field label="New password" error={errors.new_password}><PasswordInput autoComplete="new-password" required value={values.new_password} onChange={set('new_password')} /></Field>
          <Field label="Confirm new password" error={mismatch}><PasswordInput autoComplete="new-password" required value={values.confirm} onChange={set('confirm')} /></Field>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
        </form>
      </div>
    </>
  )
}
