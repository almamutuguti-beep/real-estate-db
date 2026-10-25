'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import './settings-panel.css'

const EMPTY_PWD = { currentPassword: '', newPassword: '', confirm: '' }

function Message({ message }) {
  if (!message) return null
  return <p role={message.type === 'error' ? 'alert' : 'status'} className={`settings-msg ${message.type}`}>{message.text}</p>
}

export default function SettingsPanel({ onUnauthorized }) {
  const [account, setAccount] = useState(null)
  const [form, setForm] = useState({ fullName: '', companyName: '', phone: '', email: '' })
  const [pwd, setPwd] = useState(EMPTY_PWD)
  const [profileMsg, setProfileMsg] = useState(null)
  const [pwdMsg, setPwdMsg] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

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
        else if (!cancelled) setProfileMsg({ type: 'error', text: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [applyAccount])

  const isOwner = account && account.role === 'Owner'
  const isTenant = account && account.role === 'Tenant'

  function setField(name) {
    return (event) => setForm((current) => ({ ...current, [name]: event.target.value }))
  }

  async function saveProfile(event) {
    event.preventDefault()
    setProfileMsg(null)
    setSavingProfile(true)
    try {
      const body = { phone: form.phone, email: form.email }
      if (isOwner) body.companyName = form.companyName
      if (isTenant) body.fullName = form.fullName
      const result = await apiFetch('/api/settings/profile', { method: 'PATCH', body: JSON.stringify(body) })
      applyAccount(result.data)
      setProfileMsg({ type: 'ok', text: 'Profile saved.' })
    } catch (err) {
      if (err.status === 401) unauthorizedRef.current()
      else setProfileMsg({ type: 'error', text: err.message })
    } finally {
      setSavingProfile(false)
    }
  }

  async function changePassword(event) {
    event.preventDefault()
    setPwdMsg(null)
    if (pwd.newPassword !== pwd.confirm) {
      setPwdMsg({ type: 'error', text: 'The new passwords do not match.' })
      return
    }
    setSavingPwd(true)
    try {
      await apiFetch('/api/settings/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword }),
      })
      setPwd(EMPTY_PWD)
      setPwdMsg({ type: 'ok', text: 'Password changed.' })
    } catch (err) {
      if (err.status === 401) unauthorizedRef.current()
      else setPwdMsg({ type: 'error', text: err.message })
    } finally {
      setSavingPwd(false)
    }
  }

  if (!account) {
    return <><Message message={profileMsg} />{!profileMsg && <p className="settings-loading">Loading settings…</p>}</>
  }

  return (
    <div className="settings-grid">
      <section className="panel-card">
        <div className="panel-heading"><div><h2>Profile</h2><p>Keep your contact details up to date.</p></div></div>
        {isOwner || isTenant ? (
          <form className="settings-form" onSubmit={saveProfile}>
            <label>Username<input value={account.username} disabled /></label>
            {isOwner && <label>Company name<input value={form.companyName} onChange={setField('companyName')} maxLength={100} /></label>}
            {isTenant && <label>Full name<input value={form.fullName} onChange={setField('fullName')} maxLength={100} required /></label>}
            <label>Email<input type="email" value={form.email} onChange={setField('email')} required /></label>
            <label>Phone<input type="tel" value={form.phone} onChange={setField('phone')} required /></label>
            <Message message={profileMsg} />
            <button className="primary-button" type="submit" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save changes'}</button>
          </form>
        ) : (
          <p className="settings-loading">Profile editing is available for owner and tenant accounts.</p>
        )}
      </section>

      <section className="panel-card">
        <div className="panel-heading"><div><h2>Password</h2><p>Use at least 8 characters.</p></div></div>
        <form className="settings-form" onSubmit={changePassword}>
          <label>Current password<input type="password" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} autoComplete="current-password" required /></label>
          <label>New password<input type="password" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} autoComplete="new-password" minLength={8} required /></label>
          <label>Confirm new password<input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} autoComplete="new-password" minLength={8} required /></label>
          <Message message={pwdMsg} />
          <button className="primary-button" type="submit" disabled={savingPwd}>{savingPwd ? 'Updating…' : 'Change password'}</button>
        </form>
      </section>
    </div>
  )
}