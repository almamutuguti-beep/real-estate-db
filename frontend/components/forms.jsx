'use client'

import { useRef, useState } from 'react'
import { Field } from './ui'
import { money } from '../lib/format'

const TYPES = ['Apartment', 'House', 'Studio', 'Bungalow', 'Maisonette', 'Townhouse', 'Loft']

function validateProperty(v) {
  const errors = {}
  const address = v.address.trim()
  if (!address) errors.address = 'Enter the property address.'
  else if (address.length < 3) errors.address = 'The address looks too short.'
  else if (address.length > 255) errors.address = 'Keep the address under 255 characters.'
  if (v.propertyType.trim().length > 50) errors.propertyType = 'Keep the type under 50 characters.'
  for (const [key, label] of [['bedrooms', 'Bedrooms'], ['bathrooms', 'Bathrooms']]) {
    if (v[key] !== '') {
      const n = Number(v[key])
      if (!Number.isInteger(n) || n < 0 || n > 50) errors[key] = `${label} must be a whole number from 0 to 50.`
    }
  }
  if (v.monthlyRent === '') errors.monthlyRent = 'Enter the monthly rent.'
  else {
    const rent = Number(v.monthlyRent)
    if (!Number.isFinite(rent) || rent <= 0) errors.monthlyRent = 'Rent must be more than 0.'
    else if (rent > 99999999) errors.monthlyRent = 'That rent is too large.'
  }
  return errors
}

function validateLease(v) {
  const errors = {}
  if (!v.startDate) errors.startDate = 'Choose a start date.'
  if (!v.endDate) errors.endDate = 'Choose an end date.'
  if (v.startDate && v.endDate && v.endDate <= v.startDate) errors.endDate = 'The end date must be after the start date.'
  const rent = Number(v.monthlyRent)
  if (v.monthlyRent === '' || !Number.isFinite(rent) || rent <= 0) errors.monthlyRent = 'Enter a rent above 0.'
  return errors
}

function useForm(initial, validate) {
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef(null)
  const errors = validate(values)
  const show = (name) => ((submitted || touched[name]) && errors[name]) || undefined
  const bind = (name) => ({
    value: values[name],
    onChange: (event) => setValues((current) => ({ ...current, [name]: event.target.value })),
    onBlur: () => setTouched((current) => ({ ...current, [name]: true })),
    'aria-invalid': show(name) ? true : undefined,
  })
  function submit(event, onValid) {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length > 0) {
      window.requestAnimationFrame(() => {
        const bad = formRef.current && formRef.current.querySelector('[aria-invalid="true"]')
        if (bad) bad.focus()
      })
      return
    }
    onValid(values)
  }
  return { values, show, bind, submit, formRef }
}

export function PropertyForm({ mode, initial, saving, serverError, onSubmit, onCancel }) {
  const form = useForm(initial, validateProperty)
  const { values, show, bind } = form
  const rentOk = values.monthlyRent !== '' && Number(values.monthlyRent) > 0

  return (
    <form className="ui-form" ref={form.formRef} onSubmit={(event) => form.submit(event, onSubmit)} noValidate>
      {serverError ? <p className="ui-banner error" role="alert">{serverError}</p> : null}
      <Field label="Address" required error={show('address')}>
        <input className="ui-input" {...bind('address')} placeholder="e.g. 10 Example Road, Nairobi" maxLength={255} autoComplete="off" />
      </Field>
      <Field label="Property type" error={show('propertyType')} hint="Pick one or type your own.">
        <input className="ui-input" {...bind('propertyType')} list="property-types" placeholder="e.g. Apartment" maxLength={50} />
        <datalist id="property-types">{TYPES.map((type) => <option key={type} value={type} />)}</datalist>
      </Field>
      <div className="ui-row">
        <Field label="Bedrooms" error={show('bedrooms')}>
          <input className="ui-input" type="number" min="0" max="50" step="1" inputMode="numeric" {...bind('bedrooms')} placeholder="0" />
        </Field>
        <Field label="Bathrooms" error={show('bathrooms')}>
          <input className="ui-input" type="number" min="0" max="50" step="1" inputMode="numeric" {...bind('bathrooms')} placeholder="0" />
        </Field>
      </div>
      <Field label="Monthly rent" required error={show('monthlyRent')} hint={rentOk ? `${money(values.monthlyRent)} per month` : 'Amount charged each month.'}>
        <input className="ui-input" type="number" min="0" step="0.01" inputMode="decimal" {...bind('monthlyRent')} placeholder="0.00" />
      </Field>
      {mode === 'edit' && (
        <Field label="Status" hint="Use Rented when a tenant has moved in.">
          <select className="ui-select" {...bind('status')}>
            <option value="Available">Available</option>
            <option value="Rented">Rented</option>
          </select>
        </Field>
      )}
      <div className="ui-dialog-actions">
        <button type="button" className="ui-btn ui-btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="ui-btn" disabled={saving}>{saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create property'}</button>
      </div>
    </form>
  )
}

export function LeaseForm({ initial, saving, serverError, onSubmit, onCancel }) {
  const form = useForm(initial, validateLease)
  const { values, show, bind } = form
  return (
    <form className="ui-form" ref={form.formRef} onSubmit={(event) => form.submit(event, onSubmit)} noValidate>
      {serverError ? <p className="ui-banner error" role="alert">{serverError}</p> : null}
      <div className="ui-row">
        <Field label="Start date" required error={show('startDate')}>
          <input className="ui-input" type="date" {...bind('startDate')} />
        </Field>
        <Field label="End date" required error={show('endDate')}>
          <input className="ui-input" type="date" {...bind('endDate')} />
        </Field>
      </div>
      <Field label="Monthly rent" required error={show('monthlyRent')} hint={Number(values.monthlyRent) > 0 ? `${money(values.monthlyRent)} per month` : undefined}>
        <input className="ui-input" type="number" min="0" step="0.01" inputMode="decimal" {...bind('monthlyRent')} />
      </Field>
      <div className="ui-dialog-actions">
        <button type="button" className="ui-btn ui-btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="ui-btn" disabled={saving}>{saving ? 'Creating…' : 'Create lease'}</button>
      </div>
    </form>
  )
}