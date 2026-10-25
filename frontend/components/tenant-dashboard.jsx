'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Home } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { formatDate, money } from '../lib/format'
import SettingsPanel from './settings-panel'
import { Skeleton, Toasts, useToasts } from './ui'
import { ListingGrid } from './public-home'
import './public-home.css'

function Pill({ children }) {
  const tone = ['Approved', 'Active', 'Complete', 'Signed'].includes(children) ? 'success' : ['Pending', 'Draft'].includes(children) ? 'warning' : 'neutral'
  return <span className={`status-pill ${tone}`}><span className="status-dot" />{children}</span>
}

function Row({ title, subtitle, meta, pill }) {
  return (
    <div className="application-row">
      <div className="avatar avatar-soft"><Building2 size={16} /></div>
      <div className="application-info"><strong>{title}</strong><span>{subtitle}</span></div>
      <span className="application-date">{meta}</span>
      {pill ? <Pill>{pill}</Pill> : null}
    </div>
  )
}

function Panel({ title, text, empty, items, render }) {
  return (
    <section className="panel-card">
      <div className="panel-heading"><div><h2>{title}</h2><p>{text}</p></div></div>
      {items.length === 0 ? <p className="home-empty">{empty}</p> : <div className="application-list">{items.map(render)}</div>}
    </section>
  )
}

export default function TenantDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('Browse')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [toasts, notify] = useToasts()
  const [data, setData] = useState({ homes: [], applications: [], leases: [], payments: [] })

  const logoutRef = useRef(onLogout)
  logoutRef.current = onLogout

  const handleError = useCallback((err) => {
    if (err && err.status === 401) {
      logoutRef.current()
      return
    }
    notify((err && err.message) || 'Something went wrong', 'error')
  }, [notify])

  const load = useCallback(async () => {
    try {
      const [homes, applications, leases, payments] = await Promise.all([
        apiFetch('/api/public/properties'),
        apiFetch('/api/tenant/applications'),
        apiFetch('/api/tenant/leases'),
        apiFetch('/api/tenant/payments'),
      ])
      setData({ homes: homes.data, applications: applications.data, leases: leases.data, payments: payments.data })
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }, [handleError])

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

  const appliedIds = useMemo(
    () => new Set(data.applications.filter((a) => a.status === 'Pending' || a.status === 'Approved').map((a) => a.property_id)),
    [data.applications]
  )
  const pendingCount = data.applications.filter((a) => a.status === 'Pending').length

  const visibleHomes = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.homes.filter((p) => `${p.address} ${p.property_type || ''}`.toLowerCase().includes(needle))
  }, [data.homes, query])

  async function apply(propertyId) {
    try {
      await apiFetch('/api/tenant/applications', { method: 'POST', body: JSON.stringify({ propertyId }) })
      notify('Application sent to the owner')
      await load()
    } catch (err) {
      handleError(err)
    }
  }

  const tabs = [
    ['Browse', `Browse homes (${data.homes.length})`],
    ['Applications', pendingCount ? `My applications (${pendingCount} pending)` : 'My applications'],
    ['Leases', 'My leases'],
    ['Payments', 'Payments'],
    ['Settings', 'Settings'],
  ]

  return (
    <div className="home-shell">
      <header className="home-header home-header-static">
        <div className="home-brand"><span className="home-mark"><Home size={16} /></span> Velora</div>
        <div className="home-actions">
          <span className="home-user">Signed in as {user.username}</span>
          <button type="button" className="home-btn" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <nav className="home-tabs" role="tablist" aria-label="Tenant sections">
        {tabs.map(([key, label]) => <button key={key} type="button" role="tab" className="home-tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>)}
      </nav>

      <main className="home-section">
        <Toasts items={toasts} />
        {loading && <Skeleton rows={4} />}

        {tab === 'Browse' && (
          <>
            <input className="home-tab-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search homes" aria-label="Search homes" />
            <ListingGrid
              properties={visibleHomes}
              renderAction={(property) => appliedIds.has(property.property_id)
                ? <button type="button" className="home-card-action" disabled>Applied</button>
                : <button type="button" className="home-card-action" onClick={() => apply(property.property_id)}>Apply now</button>}
            />
          </>
        )}

        {tab === 'Applications' && (
          <Panel title="My applications" text="Track the status of every home you applied for." empty="You have not applied for any homes yet." items={data.applications}
            render={(a) => <Row key={a.rental_application_id} title={a.address} subtitle={a.property_type || 'Property'} meta={`Applied ${formatDate(a.application_date)}`} pill={a.status} />} />
        )}

        {tab === 'Leases' && (
          <Panel title="My leases" text="Leases created after an owner approves your application." empty="No leases yet. Once an owner approves an application, the lease appears here." items={data.leases}
            render={(l) => <Row key={l.lease_id} title={l.address} subtitle={`${formatDate(l.start_date)} to ${formatDate(l.end_date)}`} meta={`${money(l.monthly_rent)} / month`} pill={l.status} />} />
        )}

        {tab === 'Payments' && (
          <Panel title="Payments" text="Your rent payment history." empty="No payments recorded yet." items={data.payments}
            render={(p) => <Row key={p.payment_id} title={p.address} subtitle={p.payment_method} meta={`${money(p.amount)} on ${formatDate(p.payment_date)}`} pill={p.status} />} />
        )}

        {tab === 'Settings' && <SettingsPanel onUnauthorized={onLogout} />}
      </main>
    </div>
  )
}