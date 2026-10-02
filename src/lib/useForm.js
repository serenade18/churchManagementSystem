import { useState } from 'react'

/** Small form-state helper that maps DRF field errors back onto inputs. */
export function useForm(initial) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (eOrValue) => {
    const v = eOrValue?.target ? (eOrValue.target.type === 'checkbox' ? eOrValue.target.checked : eOrValue.target.value) : eOrValue
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  const submit = async (action) => {
    setBusy(true)
    setErrors({})
    setError('')
    try {
      return await action(values)
    } catch (e) {
      const data = e.data
      if (data && typeof data === 'object' && !Array.isArray(data) && !data.detail) {
        const fieldErrors = {}
        Object.entries(data).forEach(([k, v]) => { if (k in values) fieldErrors[k] = [].concat(v).join(' ') })
        setErrors(fieldErrors)
        if (Object.keys(fieldErrors).length < Object.keys(data).length || !Object.keys(fieldErrors).length) setError(e.message)
      } else {
        setError(e.message)
      }
      throw e
    } finally {
      setBusy(false)
    }
  }

  return { values, setValues, set, errors, error, busy, submit }
}

/** Convert empty strings to null so optional dates / foreign keys clear properly. */
export const clean = (values) => Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === '' ? null : v]))
