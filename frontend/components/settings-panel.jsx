'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import { Field, PasswordInput, Skeleton, Toasts, useToasts } from './ui'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[0-9+\s-]{7,15}$/
const EMPTY_PWD = { currentPassword: '', newPassword: '', confirm: '' }

function profileErrors(form, role) {
  const errors = {}
  if (!EMAIL_RE.test(form.email.trim()) || form.email.trim().length > 100) errors.email = 'Enter a valid email address.'
  if (!PHONE_RE.test(form.phone.trim())) errors.phone = 'Enter a phone number with 7 to 15 digits.'
  if (role === 'Tenant' && !form.fullName.trim()) errors.fullName = 'Enter your full name.'
  if (role === 'Owner' && form.companyName.trim().length > 100) errors.companyName = 'Keep the company name under 100 characters.'
  return errors
}

function passwordErrors(pwd) {
  const errors = {}
  if (!pwd.currentPassword) errors.currentPassword = 'Enter your current password.'
  if (pwd.newPassword.length < 8) errors.newPassword = 'Use at least 8 characters.'
  else if (pwd.newPassword === pwd.currentPassword) errors.newPassword = 'Choose a password different from the current one.'
  if (pwd.confirm !== pwd.newPassword) errors.confirm = 'The passwords do not match.'
  return errors
}

export default function SettingsPanel({ onUnauthorized }) {
  const [account, setAccount] = useState(null)
  const [form, setForm] = useState({ fullName: '', companyName: '', phone: '', email: '' })
  const [pwd, setPwd] = useState(EMPTY_PWD)
  const [profileTried, setProfileTried] = useState(false)
  const [pwdTried, setPwdTried] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [toasts, notify] = useToasts()

  const unauthorizedRef = useRef(onUnauthorized)
  unauthorizedRef.current = onUnauthorized

  const applyAccount = useCallback((data) => {
    setAccount(data)
    setForm({
      fullName: data.profile.fullName || '',
      companyName: data.profile.companyName || '',
      phone: data.profile.phone || '',
      email: data.profile.email || '',
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/settings')
      .then((result) => {
        if (!cancelled) applyAccount(result.data)
      })
      .catch((err) => {
        if (err.status === 401) unauthorizedRef.current()
        else if (!cancelled) setLoadError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [applyAccount])

  if (loadError) return <p className="ui-banner error" role="alert">{loadError}</p>
  if (!account) return <Skeleton rows={4} />

  const isOwner = account.role === 'Owner'
  const isTenant = account.role === 'Tenant'
  const saved = account.profile
  const dirty = form.phone !== (saved.phone || '') || form.email !== (saved.email || '')
    || (isOwner && form.companyName !== (saved.companyName || ''))
    || (isTenant && form.fullName !== (saved.fullName || ''))
  const pErrors = profileErrors(form, account.role)
  const wErrors = passwordErrors(pwd)
  const showP = (name) => (profileTried && pErrors[name]) || undefined
  const showW = (name) => (pwdTried && wErrors[name]) || undefined
  const setField = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }))
  const setPw = (name) => (event) => setPwd((current) => ({ ...current, [name]: event.target.value }))

  async function saveProfile(event) {
    event.preventDefault()
    setProfileTried(true)
    setProfileError('')
    if (Object.keys(pErrors).length > 0) return
    setSavingProfile(true)
    try {
      const body = { phone: form.phone.trim(), email: form.email.trim() }
      if (isOwner) body.companyName = form.companyName.trim()
      if (isTenant) body.fullName = form.fullName.trim()
      const result = await apiFetch('/api/settings/profile', { method: 'PATCH', body: JSON.stringify(body) })
      applyAccount(result.data)
      setProfileTried(false)
      notify('Profile saved')
    } catch (err) {
      if (err.status === 401) unauthorizedRef.current()
      else setProfileError(err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function changePassword(event) {
    event.preventDefault()
    setPwdTried(true)
    setPwdError('')
    if (Object.keys(wErrors).length > 0) return
    setSavingPwd(true)
    try {
      await apiFetch('/api/settings/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword }),
      })
      setPwd(EMPTY_PWD)
      setPwdTried(false)
      notify('Password changed')
    } catch (err) {
      if (err.status === 401) unauthorizedRef.current()
      else setPwdError(err.message)
    } finally {
      setSavingPwd(false)
    }
  }

  return (
    <>
      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
        <section className="panel-card">
          <div className="panel-heading"><div><h2>Profile</h2><p>Keep your contact details up to date.</p></div></div>
          {isOwner || isTenant ? (
            <form className="ui-form" onSubmit={saveProfile} noValidate>
              {profileError ? <p className="ui-banner error" role="alert">{profileError}</p> : null}
              <Field label="Username" hint="Your username cannot be changed.">
                <input className="ui-input" value={account.username} disabled />
              </Field>
              {isOwner && (
                <Field label="Company name" error={showP('companyName')}>
                  <input className="ui-input" value={form.companyName} onChange={setField('companyName')} maxLength={100} aria-invalid={showP('companyName') ? true : undefined} />
                </Field>
              )}
              {isTenant && (
                <Field label="Full name" required error={showP('fullName')}>
                  <input className="ui-input" value={form.fullName} onChange={setField('fullName')} maxLength={100} aria-invalid={showP('fullName') ? true : undefined} />
                </Field>
              )}
              <Field label="Email" required error={showP('email')}>
                <input className="ui-input" type="email" value={form.email} onChange={setField('email')} autoComplete="email" aria-invalid={showP('email') ? true : undefined} />
              </Field>
              <Field label="Phone" required error={showP('phone')}>
                <input className="ui-input" type="tel" value={form.phone} onChange={setField('phone')} autoComplete="tel" aria-invalid={showP('phone') ? true : undefined} />
              </Field>
              <button className="ui-btn" type="submit" disabled={savingProfile || !dirty}>{savingProfile ? 'Saving…' : dirty ? 'Save changes' : 'No changes to save'}</button>
            </form>
          ) : (
            <p className="ui-sub">Profile editing is available for owner and tenant accounts.</p>
          )}
        </section>

        <section className="panel-card">
          <div className="panel-heading"><div><h2>Password</h2><p>Use at least 8 characters.</p></div></div>
          <form className="ui-form" onSubmit={changePassword} noValidate>
            {pwdError ? <p className="ui-banner error" role="alert">{pwdError}</p> : null}
            <Field label="Current password" required error={showW('currentPassword')}>
              <PasswordInput value={pwd.currentPassword} onChange={setPw('currentPassword')} autoComplete="current-password" invalid={!!showW('currentPassword')} />
            </Field>
            <Field label="New password" required error={showW('newPassword')}>
              <PasswordInput value={pwd.newPassword} onChange={setPw('newPassword')} autoComplete="new-password" invalid={!!showW('newPassword')} />
            </Field>
            <Field label="Confirm new password" required error={showW('confirm')}>
              <PasswordInput value={pwd.confirm} onChange={setPw('confirm')} autoComplete="new-password" invalid={!!showW('confirm')} />
            </Field>
            <button className="ui-btn" type="submit" disabled={savingPwd}>{savingPwd ? 'Updating…' : 'Change password'}</button>
          </form>
        </section>
      </div>
      <Toasts items={toasts} />
    </>
  )
}