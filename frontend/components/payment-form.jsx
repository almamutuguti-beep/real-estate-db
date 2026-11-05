'use client'

import { useState } from 'react'
import { Field, EmptyState } from './ui'
import { money } from '../lib/format'

const METHODS = ['M-Pesa', 'Bank Transfer', 'Card', 'Cash']

export default function PayRentForm({ leases, saving, serverError, onSubmit, onCancel }) {
  const first = leases[0]
  const [values, setValues] = useState({
    leaseId: first ? String(first.lease_id) : '',
    amount: first ? String(first.monthly_rent) : '',
    paymentMethod: 'M-Pesa',
    reference: '',
  })
  const [tried, setTried] = useState(false)

  if (leases.length === 0) {
    return (
      <>
        <EmptyState title="No active lease" text="You can pay rent once an owner activates your lease." />
        <div className="ui-dialog-actions">
          <button type="button" className="ui-btn ui-btn-ghost" onClick={onCancel}>Close</button>
        </div>
      </>
    )
  }

  const errors = {}
  const amount = Number(values.amount)
  if (!values.leaseId) errors.leaseId = 'Choose a lease.'
  if (values.amount === '' || !Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter an amount above 0.'
  if (values.reference.trim().length > 50) errors.reference = 'Keep the reference under 50 characters.'
  const show = (name) => (tried && errors[name]) || undefined

  function setLease(event) {
    const lease = leases.find((l) => String(l.lease_id) === event.target.value)
    setValues((current) => ({ ...current, leaseId: event.target.value, amount: lease ? String(lease.monthly_rent) : current.amount }))
  }
  const set = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }))

  function submit(event) {
    event.preventDefault()
    setTried(true)
    if (Object.keys(errors).length > 0) return
    onSubmit(values)
  }

  return (
    <form className="ui-form" onSubmit={submit} noValidate>
      {serverError ? <p className="ui-banner error" role="alert">{serverError}</p> : null}
      <Field label="Lease" required error={show('leaseId')}>
        <select className="ui-select" value={values.leaseId} onChange={setLease}>
          {leases.map((lease) => <option key={lease.lease_id} value={lease.lease_id}>{lease.address}</option>)}
        </select>
      </Field>
      <Field label="Amount" required error={show('amount')} hint={amount > 0 ? `${money(amount)}` : 'Amount you are paying now.'}>
        <input className="ui-input" type="number" min="0" step="0.01" inputMode="decimal" value={values.amount} onChange={set('amount')} aria-invalid={show('amount') ? true : undefined} />
      </Field>
      <Field label="Payment method" required>
        <select className="ui-select" value={values.paymentMethod} onChange={set('paymentMethod')}>
          {METHODS.map((method) => <option key={method}>{method}</option>)}
        </select>
      </Field>
      <Field label="Reference (optional)" error={show('reference')} hint="For example the M-Pesa or bank transaction code.">
        <input className="ui-input" value={values.reference} onChange={set('reference')} maxLength={50} autoComplete="off" aria-invalid={show('reference') ? true : undefined} />
      </Field>
      <p className="ui-sub" style={{ margin: 0 }}>Your payment is sent as pending. It counts once the owner confirms they received it.</p>
      <div className="ui-dialog-actions">
        <button type="button" className="ui-btn ui-btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="ui-btn" disabled={saving}>{saving ? 'Sending…' : 'Submit payment'}</button>
      </div>
    </form>
  )
}