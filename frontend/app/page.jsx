'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import { formatDate, initialsOf, money } from '../lib/format'
import AuthScreen from '../components/auth-screen'
import PublicHome from '../components/public-home'
import TenantDashboard from '../components/tenant-dashboard'
import SettingsPanel from '../components/settings-panel'
import { Bell, Building2, ChevronDown, CircleDollarSign, ClipboardList, Home, LogOut, Menu, Plus, Search, Settings, ShieldCheck, Users, X } from 'lucide-react'

const ACCENTS = ['teal', 'orange', 'blue']
const EMPTY_FORM = { address: '', propertyType: '', bedrooms: '', bathrooms: '', monthlyRent: '', status: 'Available' }
const MAIN_NAV = [['Overview', Home], ['Properties', Building2], ['Applications', ClipboardList], ['Tenants', Users], ['Payments', CircleDollarSign]]

function StatusPill({ children }) {
  const tone = ['Approved', 'Available', 'Complete', 'Active'].includes(children) ? 'success' : ['Pending', 'Review'].includes(children) ? 'warning' : 'neutral'
  return <span className={`status-pill ${tone}`}><span className="status-dot" />{children}</span>
}

function PropertyVisual({ accent }) {
  return <div className={`property-visual ${accent}`}><Building2 size={28} strokeWidth={1.5} /><span>Property preview</span></div>
}

function EmptyNote({ children }) {
  return <p style={{ padding: '16px 4px', opacity: 0.7 }}>{children}</p>
}

function StatCard({ icon: Icon, tone, label, value, hint }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
      <div><span>{label}</span><strong>{value}</strong><small className="muted">{hint}</small></div>
      <div className={`sparkline ${tone}-line`} />
    </div>
  )
}

function PropertyGrid({ properties, onEdit, onRemove }) {
  if (properties.length === 0) return <EmptyNote>No properties to show yet. Use Add property to create the first one.</EmptyNote>
  return (
    <div className="property-grid">
      {properties.map((property, index) => {
        const details = [property.bedrooms != null && `${property.bedrooms} bed`, property.bathrooms != null && `${property.bathrooms} bath`].filter(Boolean).join(', ')
        return (
          <article className="property-card" key={property.property_id}>
            <PropertyVisual accent={ACCENTS[index % ACCENTS.length]} />
            <div className="property-body">
              <div className="property-top">
                <StatusPill>{property.status}</StatusPill>
                <span style={{ display: 'flex', gap: 10 }}>
                  <button className="text-button" onClick={() => onEdit(property)}>Edit</button>
                  <button className="text-button" onClick={() => onRemove(property)}>Remove</button>
                </span>
              </div>
              <h3>{property.address}</h3>
              <p>{details || 'No room details yet'}</p>
              <div className="property-meta"><span>{property.property_type || 'Property'}</span><strong>{money(property.monthly_rent)}<small>/ month</small></strong></div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function ApplicationList({ applications, onReview }) {
  if (applications.length === 0) return <EmptyNote>No applications yet.</EmptyNote>
  return (
    <div className="application-list">
      {applications.map((application) => (
        <div className="application-row" key={application.rental_application_id}>
          <div className="avatar avatar-soft">{initialsOf(application.tenant_name)}</div>
          <div className="application-info"><strong>{application.tenant_name}</strong><span>{application.address}</span></div>
          <span className="application-date">{formatDate(application.application_date)}</span>
          <StatusPill>{application.status}</StatusPill>
          {application.status === 'Pending' ? (
            <span style={{ display: 'flex', gap: 8 }}>
              <button className="text-button" onClick={() => onReview(application.rental_application_id, 'Approved')}>Approve</button>
              <button className="text-button" onClick={() => onReview(application.rental_application_id, 'Rejected')}>Reject</button>
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function TenantList({ tenants }) {
  if (tenants.length === 0) return <EmptyNote>No tenants on active leases yet.</EmptyNote>
  return (
    <div className="application-list">
      {tenants.map((tenant) => (
        <div className="application-row" key={`${tenant.tenant_id}-${tenant.lease_id}`}>
          <div className="avatar avatar-soft">{initialsOf(tenant.full_name)}</div>
          <div className="application-info"><strong>{tenant.full_name}</strong><span>{tenant.address} · {tenant.phone}</span></div>
          <span className="application-date">{money(tenant.monthly_rent)} / month</span>
          <StatusPill>{tenant.lease_status}</StatusPill>
        </div>
      ))}
    </div>
  )
}

function PaymentList({ payments }) {
  if (payments.length === 0) return <EmptyNote>No completed payments yet.</EmptyNote>
  return (
    <div className="application-list">
      {payments.map((payment) => (
        <div className="application-row" key={payment.payment_id}>
          <div className="avatar avatar-soft">{initialsOf(payment.tenant_name)}</div>
          <div className="application-info"><strong>{payment.tenant_name}</strong><span>{payment.address}</span></div>
          <span className="application-date">{money(payment.amount)} on {formatDate(payment.payment_date)}</span>
          <StatusPill>{payment.payment_method}</StatusPill>
        </div>
      ))}
    </div>
  )
}

function ReportPanel({ report }) {
  if (!report) return <EmptyNote>Loading report…</EmptyNote>
  const s = report.summary
  return (
    <>
      <div className="stats-grid">
        <StatCard icon={Building2} tone="teal" label="Occupancy" value={`${s.occupancyRate}%`} hint={`${s.rentedProperties} of ${s.totalProperties} rented`} />
        <StatCard icon={Home} tone="blue" label="Available" value={s.availableProperties} hint="Ready to rent" />
        <StatCard icon={Users} tone="brand" label="Active tenants" value={s.activeTenants} hint="On active leases" />
        <StatCard icon={CircleDollarSign} tone="orange" label="Income received" value={money(s.totalIncomeReceived)} hint="All completed payments" />
      </div>
      <section className="panel-card">
        <div className="panel-heading"><div><h2>Income by property</h2><p>Completed payments and active leases per property.</p></div></div>
        {report.properties.length === 0 ? <EmptyNote>No properties yet.</EmptyNote> : (
          <div className="application-list">
            {report.properties.map((p) => (
              <div className="application-row" key={p.property_id}>
                <div className="avatar avatar-soft"><Building2 size={16} /></div>
                <div className="application-info"><strong>{p.address}</strong><span>{p.property_type || 'Property'} · {p.active_leases} active {p.active_leases === 1 ? 'lease' : 'leases'}</span></div>
                <span className="application-date">{money(p.income_received)} received</span>
                <StatusPill>{p.status}</StatusPill>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function Dashboard({ user, onLogout }) {
  const [active, setActive] = useState('Overview')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ summary: null, properties: [], applications: [], tenants: [], payments: [], report: null })
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const logoutRef = useRef(onLogout)
  logoutRef.current = onLogout

  const notify = useCallback((message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3200)
  }, [])

  const handleError = useCallback((err) => {
    if (err && err.status === 401) {
      logoutRef.current()
      return
    }
    notify((err && err.message) || 'Something went wrong')
  }, [notify])

  const load = useCallback(async () => {
    try {
      const [summary, properties, applications, tenants, payments, report] = await Promise.all([
        apiFetch('/api/dashboard/summary'),
        apiFetch('/api/properties'),
        apiFetch('/api/applications'),
        apiFetch('/api/tenants'),
        apiFetch('/api/payments'),
        apiFetch('/api/reports/owner'),
      ])
      setData({ summary, properties: properties.data, applications: applications.data, tenants: tenants.data, payments: payments.data, report: report.data })
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

  const summary = data.summary || {}
  const pendingCount = data.applications.filter((application) => application.status === 'Pending').length

  const filteredProperties = useMemo(() => {
    const needle = query.toLowerCase()
    return data.properties.filter((property) => `${property.address} ${property.property_type || ''}`.toLowerCase().includes(needle))
  }, [data.properties, query])

  const series = summary.incomeSeries || []
  const maxAmount = Math.max(1, ...series.map((point) => point.amount))
  const points = series.map((point, index) => ({
    x: series.length > 1 ? (index / (series.length - 1)) * 440 : 0,
    y: 110 - (point.amount / maxAmount) * 90,
  }))
  const linePath = points.length ? `M${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')}` : ''
  const areaPath = linePath ? `${linePath} V120 H0 Z` : ''

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const initials = user.username.slice(0, 2).toUpperCase()

  function go(label) {
    setActive(label)
    setMenuOpen(false)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError('')
    setModal({ mode: 'create' })
  }

  function openEdit(property) {
    setForm({
      address: property.address,
      propertyType: property.property_type || '',
      bedrooms: property.bedrooms == null ? '' : String(property.bedrooms),
      bathrooms: property.bathrooms == null ? '' : String(property.bathrooms),
      monthlyRent: String(property.monthly_rent),
      status: property.status === 'Rented' ? 'Rented' : 'Available',
    })
    setFormError('')
    setModal({ mode: 'edit', id: property.property_id })
  }

  function closeModal() {
    setModal(null)
    setFormError('')
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function saveProperty(event) {
    event.preventDefault()
    setFormError('')
    const editing = modal && modal.mode === 'edit'
    const body = { address: form.address.trim(), monthlyRent: Number(form.monthlyRent) }
    if (editing) {
      body.propertyType = form.propertyType.trim() || null
      body.bedrooms = form.bedrooms === '' ? null : Number(form.bedrooms)
      body.bathrooms = form.bathrooms === '' ? null : Number(form.bathrooms)
      body.status = form.status
    } else {
      if (form.propertyType.trim()) body.propertyType = form.propertyType.trim()
      if (form.bedrooms !== '') body.bedrooms = Number(form.bedrooms)
      if (form.bathrooms !== '') body.bathrooms = Number(form.bathrooms)
    }

    setSaving(true)
    try {
      await apiFetch(editing ? `/api/properties/${modal.id}` : '/api/properties', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      })
      closeModal()
      notify(editing ? 'Property updated' : 'Property created')
      await load()
    } catch (err) {
      if (err.status === 401) handleError(err)
      else setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function removeProperty(property) {
    if (!window.confirm(`Remove ${property.address}? It will no longer be listed.`)) return
    try {
      await apiFetch(`/api/properties/${property.property_id}`, { method: 'DELETE' })
      notify('Property removed')
      await load()
    } catch (err) {
      handleError(err)
    }
  }

  async function reviewApplication(id, status) {
    try {
      await apiFetch(`/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      notify(`Application ${status.toLowerCase()}`)
      await load()
    } catch (err) {
      handleError(err)
    }
  }

  const propertySection = (
    <>
      <div className="section-row">
        <div><h2>Property portfolio</h2><p>Keep track of your listings and occupancy.</p></div>
        <div className="section-actions">
          <div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search properties" aria-label="Search properties" /></div>
          {active === 'Overview' && <button className="text-button" onClick={() => setActive('Properties')}>View all <span>→</span></button>}
        </div>
      </div>
      <PropertyGrid properties={active === 'Overview' ? filteredProperties.slice(0, 3) : filteredProperties} onEdit={openEdit} onRemove={removeProperty} />
    </>
  )

  const incomePanel = (
    <section className="panel-card insights">
      <div className="panel-heading"><div><h2>Income overview</h2><p>Completed rent payments, last 6 months.</p></div></div>
      <div className="income-total"><strong>{money(summary.monthlyIncome)}</strong><span className="muted">this month</span></div>
      <div className="chart">
        <div className="chart-lines"><span /><span /><span /><span /></div>
        <svg viewBox="0 0 440 120" preserveAspectRatio="none" aria-label="Income chart">
          <defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#15616d" stopOpacity=".24" /><stop offset="1" stopColor="#15616d" stopOpacity="0" /></linearGradient></defs>
          {areaPath && <path d={areaPath} fill="url(#fill)" />}
          {linePath && <path d={linePath} fill="none" stroke="#15616d" strokeWidth="3" />}
        </svg>
        <div className="chart-labels">{series.map((point, index) => <span key={`${point.month}-${index}`}>{point.month}</span>)}</div>
      </div>
    </section>
  )

  const applicationsPanel = (limit) => (
    <section className="panel-card">
      <div className="panel-heading">
        <div><h2>{limit ? 'Recent applications' : 'Applications'}</h2><p>Review and manage tenant applications.</p></div>
        {limit && <button className="text-button" onClick={() => setActive('Applications')}>View all <span>→</span></button>}
      </div>
      <ApplicationList applications={limit ? data.applications.slice(0, limit) : data.applications} onReview={reviewApplication} />
    </section>
  )

  const editing = modal && modal.mode === 'edit'

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'mobile-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Home size={17} /></div><span>Velora</span><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button></div>
        <div className="workspace-switcher"><div className="avatar avatar-brand">{initials}</div><div><strong>{user.username}</strong><small>Property owner</small></div><ChevronDown size={16} /></div>
        <nav className="nav-list" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          {MAIN_NAV.map(([label, Icon]) => <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => go(label)}><Icon size={18} /><span>{label}</span>{label === 'Applications' && pendingCount > 0 && <b>{pendingCount}</b>}</button>)}
          <p className="nav-label second">Manage</p>
          <button className={`nav-item ${active === 'Reports' ? 'active' : ''}`} onClick={() => go('Reports')}><ClipboardList size={18} /><span>Reports</span></button>
          <button className={`nav-item ${active === 'Settings' ? 'active' : ''}`} onClick={() => go('Settings')}><Settings size={18} /><span>Settings</span></button>
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><ShieldCheck size={19} /><div><strong>Live data</strong><small>Refreshes every 15 seconds</small></div><span className="live-dot" /></div><button className="nav-item logout" onClick={onLogout}><LogOut size={18} /><span>Sign out</span></button></div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{active}</strong></div><div className="top-actions"><button className="icon-button" onClick={() => notify(pendingCount ? `${pendingCount} ${pendingCount === 1 ? 'application is' : 'applications are'} waiting for your review` : 'No new notifications')} aria-label="Notifications"><Bell size={19} />{pendingCount > 0 && <i />}</button><div className="top-avatar">{initials}</div></div></header>
        <div className="content">
          <div className="page-heading"><div><p className="eyebrow">{today}</p><h1>{greeting}, {user.username}<span className="heading-accent">.</span></h1><p className="heading-copy">Here&apos;s what&apos;s happening with your properties today.</p></div><button className="primary-button" onClick={openCreate}><Plus size={18} /> Add property</button></div>
          {notice && <div className="toast"><ShieldCheck size={17} />{notice}</div>}
          {loading && <EmptyNote>Loading your data…</EmptyNote>}

          {active === 'Overview' && (
            <>
              <div className="stats-grid">
                <StatCard icon={Building2} tone="teal" label="Total properties" value={summary.totalProperties ?? 0} hint="Active listings" />
                <StatCard icon={CircleDollarSign} tone="orange" label="Monthly income" value={money(summary.monthlyIncome)} hint="Completed payments this month" />
                <StatCard icon={Users} tone="blue" label="Active tenants" value={summary.activeTenants ?? 0} hint="On active leases" />
                <StatCard icon={ClipboardList} tone="brand" label="Open applications" value={summary.openApplications ?? 0} hint="Needs your review" />
              </div>
              {propertySection}
              <div className="lower-grid">{applicationsPanel(3)}{incomePanel}</div>
            </>
          )}

          {active === 'Properties' && propertySection}
          {active === 'Applications' && applicationsPanel(0)}
          {active === 'Tenants' && (
            <section className="panel-card">
              <div className="panel-heading"><div><h2>Tenants</h2><p>People on active leases at your properties.</p></div></div>
              <TenantList tenants={data.tenants} />
            </section>
          )}
          {active === 'Payments' && (
            <div className="lower-grid">
              <section className="panel-card">
                <div className="panel-heading"><div><h2>Payments</h2><p>Completed rent payments for your properties.</p></div></div>
                <PaymentList payments={data.payments} />
              </section>
              {incomePanel}
            </div>
          )}
          {active === 'Reports' && <ReportPanel report={data.report} />}
          {active === 'Settings' && <SettingsPanel onUnauthorized={onLogout} />}
        </div>
      </section>

      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <form className="modal-card" onClick={(event) => event.stopPropagation()} onSubmit={saveProperty}>
            <button type="button" className="modal-close" onClick={closeModal} aria-label="Close dialog"><X /></button>
            <div className="modal-icon"><Building2 /></div>
            <p className="eyebrow">Property setup</p>
            <h2>{editing ? 'Edit property' : 'Add a new property'}</h2>
            <label>Address<input value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="e.g. 10 Example Road, Nairobi" required /></label>
            <label>Property type<input value={form.propertyType} onChange={(e) => updateForm('propertyType', e.target.value)} placeholder="e.g. Apartment" /></label>
            <label>Bedrooms<input type="number" min="0" step="1" value={form.bedrooms} onChange={(e) => updateForm('bedrooms', e.target.value)} placeholder="0" /></label>
            <label>Bathrooms<input type="number" min="0" step="1" value={form.bathrooms} onChange={(e) => updateForm('bathrooms', e.target.value)} placeholder="0" /></label>
            <label>Monthly rent<input type="number" min="0" step="0.01" value={form.monthlyRent} onChange={(e) => updateForm('monthlyRent', e.target.value)} placeholder="0.00" required /></label>
            {editing && (
              <label>Status
                <select value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
                  <option value="Available">Available</option>
                  <option value="Rented">Rented</option>
                </select>
              </label>
            )}
            {formError && <p role="alert" style={{ color: '#b42318', margin: 0 }}>{formError}</p>}
            <button className="primary-button full" type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create property'}</button>
          </form>
        </div>
      )}
    </main>
  )
}

export default function Page() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [authMode, setAuthMode] = useState(null)

  useEffect(() => {
    apiFetch('/api/auth/session')
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // the server clears the cookie; ignore network errors here
    }
    setUser(null)
    setAuthMode(null)
  }, [])

  if (checking) {
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Loading…</main>
  }
  if (user && user.role === 'Owner') return <Dashboard user={user} onLogout={handleLogout} />
  if (user && user.role === 'Tenant') return <TenantDashboard user={user} onLogout={handleLogout} />
  if (!user && authMode) {
    return (
      <AuthScreen
        initialMode={authMode}
        onAuthed={(signedIn) => { setUser(signedIn); setAuthMode(null) }}
        onBack={() => setAuthMode(null)}
      />
    )
  }
  return (
    <PublicHome
      user={user}
      onSignIn={() => setAuthMode('login')}
      onRegister={() => setAuthMode('register')}
      onLogout={handleLogout}
    />
  )
}