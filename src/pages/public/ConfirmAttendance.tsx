import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AuthAlert, MemberAuthLayout, MemberFooter, churchPhoto } from '../../components/AuthShell'
import { Spinner } from '../../components/ui'
import { ApiError, errorMessage, request } from '../../lib/api'
import { Done } from './CheckIn'

// A member's own link from the church's SMS (/a/<code>): opening it on the service's day marks
// them present. Nothing to type; opening it again just says so.

interface Reply { church: string; service: string; date: string; name: string; already?: boolean; state: 'done' | 'early' | 'closed'; detail?: string }

export default function ConfirmAttendance() {
  const { code = '' } = useParams()
  const [reply, setReply] = useState<Reply | null>(null)
  const [error, setError] = useState('')
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return // once, even when React runs effects twice in development
    sent.current = true
    request<Reply>(`/public/attend/${code}/`, { method: 'POST', auth: false }).then(setReply).catch((e) => {
      const data = e instanceof ApiError ? (e.data as Reply | null) : null
      if (data?.state) setReply(data)
      else setError(errorMessage(e))
    })
  }, [code])

  const day = reply && new Date(reply.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <MemberAuthLayout photo={churchPhoto('/landing/community.jpg')} compact back="/">
      {error ? <AuthAlert>{error}</AuthAlert>
        : !reply ? <Spinner className="mx-auto my-16 h-8 w-8" />
          : reply.state === 'done' ? (
            <Done title={reply.already ? `Already confirmed, ${reply.name}` : `Thank you, ${reply.name}!`}>
              <p>You’re marked present at {reply.service} · {day}.</p>
            </Done>
          ) : (
            <div className="flex flex-col gap-3">
              <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] text-mk-forest">{reply.service}</h1>
              <p className="text-mk-muted">{day}</p>
              <AuthAlert>{reply.state === 'early' ? `This link works on ${day}. Open it again then.` : reply.detail}</AuthAlert>
            </div>
          )}
      <div className="mt-auto pt-4"><MemberFooter /></div>
    </MemberAuthLayout>
  )
}
