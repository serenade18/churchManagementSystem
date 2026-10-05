import { useState, type ChangeEvent } from 'react'
import type { ApiError } from './api'

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
/** What a field hands `set(key)`: a change event, or the new value itself (e.g. from <Select>). */
export type FieldInput = ChangeEvent<FieldElement> | string | number | boolean | null | undefined

export type FieldErrors<V> = Partial<Record<keyof V & string, string>>

const isEvent = (x: FieldInput): x is ChangeEvent<FieldElement> => typeof x === 'object' && x !== null && 'target' in x

/** Small form-state helper that maps DRF field errors back onto inputs. */
export function useForm<V extends object>(initial: V) {
  const [values, setValues] = useState<V>(initial)
  const [errors, setErrors] = useState<FieldErrors<V>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key: keyof V & string) => (eOrValue: FieldInput) => {
    const v = isEvent(eOrValue)
      ? (eOrValue.target.type === 'checkbox' ? (eOrValue.target as HTMLInputElement).checked : eOrValue.target.value)
      : eOrValue
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  const submit = async <R>(action: (values: V) => Promise<R>): Promise<R> => {
    setBusy(true)
    setErrors({})
    setError('')
    try {
      return await action(values)
    } catch (e) {
      const { data, message } = e as ApiError
      if (data && typeof data === 'object' && !Array.isArray(data) && !(data as { detail?: unknown }).detail) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(data).forEach(([k, v]) => { if (k in values) fieldErrors[k] = ([] as unknown[]).concat(v).join(' ') })
        setErrors(fieldErrors as FieldErrors<V>)
        if (Object.keys(fieldErrors).length < Object.keys(data).length || !Object.keys(fieldErrors).length) setError(message)
      } else {
        setError(message)
      }
      throw e
    } finally {
      setBusy(false)
    }
  }

  return { values, setValues, set, errors, error, busy, submit }
}

/** Convert empty strings to null so optional dates / foreign keys clear properly. */
export const clean = <V extends object>(values: V) =>
  Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === '' ? null : v])) as { [K in keyof V]: Exclude<V[K], ''> | null }
