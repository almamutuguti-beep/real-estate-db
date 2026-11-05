'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Building2, CircleDollarSign, ClipboardList, FileText, Home, ShieldCheck, Users } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { formatDate, initialsOf, money } from '../lib/format'
import SettingsPanel from './settings-panel'
import { ConfirmDialog, EmptyState, Skeleton, Toasts, useToasts } from './ui'
import './public-home.css'

function StatCard({ icon: Icon, tone, label, value, hint }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
      <div><span>{label}</span><strong>{value}</strong><small className="muted">{hint}</small></div>
      <div className={`sparkline ${tone}-line`} />
    </div>
  )
}

function Pill({ children }) {
  const tone = children === 'Active' ? 'success' : 'neutral'
  return <span className={`status-pill ${tone}`}><span className="status-dot" />{children}</span>
}

export default function AdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('Overview')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [query, setQuery] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [warning, setWarning] = useState('')
  const [toasts, notify] = useToasts()

  const logoutRef = useRef(onLogout)
  logoutRef.current = onLogout

  const load = useCallback(async () => {
    const results = await Promise.allSettled([apiFetch('/api/admin/summary'), apiFetch('/api/admin/users')])
    const denied = results.find((r) => r.status === 'rejected' && r.reason && (r.reason.status === 401 || r.reason.status === 403))
    if (denied) {
      logoutRef.current()
      return
    }
    const [sum, list] = results
    if (sum.status === 'fulfilled') setSummary(sum.value.data)
    if (list.status === 'fulfilled') setAccounts(list.value.data)
    setWarning(results.some((r) => r.status === 'rejected') ? 'Some information could not be loaded. We will keep trying.' : '')
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) load()
    }
    const id = setInterval(refresh, 15000)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', refresh)
    }
  }, [load])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return accounts.filter((a) => `${a.username} ${a.display_name || ''} ${a.email || ''} ${a.role}`.toLowerCase().includes(needle))
  }, [accounts, query])

  async function setActive(account, isActive) {
    setBusy(true)
    try {
      await apiFetch(`/api/admin/users/${account.user_id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) })
      notify(isActive ? `${account.username} can sign in again` : `${account.username} has been deactivated`)
      await load()
    } catch (err) {
      if (err.status === 401) logoutRef.current()
      else notify(err.message, 'error')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const s = summary
  const tabs = [['Overview', 'Overview'], ['Accounts', `Accounts${s ? ` (${s.users.total})` : ''}`], ['Settings', 'Settings']]

  return (
    <div className="home-shell">
      <header className="home-header home-header-static">
        <div className="home-brand"><span className="home-mark"><Home size={16} /></span> Velora</div>
        <div className="home-actions">
          <span className="home-user">Signed in as {user.username} (admin)</span>
          <button type="button" className="home-btn" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <nav className="home-tabs" role="tablist" aria-label="Admin sections">
        {tabs.map(([key, label]) => <button key={key} type="button" role="tab" className="home-tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>)}
      </nav>

      <main className="home-section">
        <Toasts items={toasts} />
        {warning && <p className="ui-banner error" role="alert">{warning}</p>}
        {loading && <Skeleton rows={4} />}

        {!loading && tab === 'Overview' && s && (
          <>
            <div className="home-section-head">
              <div><h2>System overview</h2><p>Everything across all owners and tenants, updated automatically.</p></div>
            </div>
            <div className="stats-grid">
              <StatCard icon={Users} tone="teal" label="Owners" value={s.users.owners} hint="Registered property owners" />
              <StatCard icon={Users} tone="blue" label="Tenants" value={s.users.tenants} hint="Registered tenants" />
              <StatCard icon={Building2} tone="orange" label="Properties" value={s.properties.total} hint={`${s.properties.available} available, ${s.properties.rented} rented`} />
              <StatCard icon={FileText} tone="brand" label="Active leases" value={s.activeLeases} hint="Currently running" />
              <StatCard icon={ClipboardList} tone="teal" label="Pending applications" value={s.pendingApplications} hint="Waiting for owners" />
              <StatCard icon={CircleDollarSign} tone="orange" label="Payments to confirm" value={s.pendingPayments} hint="Waiting for owners" />
              <StatCard icon={CircleDollarSign} tone="blue" label="Total received" value={money(s.totalReceived)} hint="Confirmed payments" />
              <StatCard icon={ShieldCheck} tone="brand" label="Deactivated accounts" value={s.users.deactivated} hint="Cannot sign in" />
            </div>
          </>
        )}

        {!loading && tab === 'Accounts' && (
          <>
            <input className="home-tab-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, username, email or role" aria-label="Search accounts" />
            {visible.length === 0 ? <EmptyState title="No accounts found" text="Try a different search." /> : (
              <section className="panel-card">
                <div className="application-list">
                  {visible.map((account) => (
                    <div className="application-row" key={account.user_id}>
                      <div className="avatar avatar-soft">{initialsOf(account.display_name || account.username)}</div>
                      <div className="application-info">
                        <strong>{account.display_name || account.username}</strong>
                        <span>{account.username} · {account.role}{account.email ? ` · ${account.email}` : ''}</span>
                      </div>
                      <span className="application-date">Joined {formatDate(account.created_at)}</span>
                      <Pill>{account.is_active ? 'Active' : 'Deactivated'}</Pill>
                      {account.role === 'Admin' ? <span className="ui-chip">Protected</span> : account.is_active ? (
                        <button className="ui-btn ui-btn-sm ui-btn-outline-danger" disabled={busy} onClick={() => setConfirm(account)}>Deactivate</button>
                      ) : (
                        <button className="ui-btn ui-btn-sm ui-btn-ok" disabled={busy} onClick={() => setActive(account, true)}>Activate</button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {tab === 'Settings' && <SettingsPanel onUnauthorized={onLogout} />}
      </main>

      {confirm && (
        <ConfirmDialog
          title="Deactivate this account?"
          message={`${confirm.username} will no longer be able to sign in. You can activate the account again at any time.`}
          confirmLabel="Deactivate"
          danger
          busy={busy}
          onConfirm={() => setActive(confirm, false)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}