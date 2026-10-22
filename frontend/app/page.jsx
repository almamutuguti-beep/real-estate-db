'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import AuthScreen from '../components/auth-screen'
import { Bell, Building2, ChevronDown, CircleDollarSign, ClipboardList, Home, LogOut, Menu, Plus, Search, Settings, ShieldCheck, Users, X } from 'lucide-react'

const CURRENCY = 'R'
const ACCENTS = ['teal', 'orange', 'blue']
const EMPTY_FORM = { address: '', propertyType: '', bedrooms: '', bathrooms: '', monthlyRent: '' }

function money(value) {
  return `${CURRENCY}${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initialsOf(name) {
  return String(name || '?').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?'
}

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

function PropertyGrid({ properties, onDetails }) {
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
                <button className="more-button" onClick={() => onDetails(property)} aria-label={`View ${property.address} details`}>•••</button>
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
          <div className="application-info"><strong>{tenant.full_name}</strong><span>{tenant.address}</span></div>
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

function Dashboard({ user, onLogout }) {
  const [active, setActive] = useState('Overview')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ summary: null, properties: [], applications: [], tenants: [], payments: [] })
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
      const [summary, properties, applications, tenants, payments] = await Promise.all([
        apiFetch('/api/dashboard/summary'),
        apiFetch('/api/properties'),
        apiFetch('/api/applications'),
        apiFetch('/api/tenants'),
        apiFetch('/api/payments'),
      ])
      setData({ summary, properties: properties.data, applications: applications.data, tenants: tenants.data, payments: payments.data })
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }, [handleError])

  useEffect(() => {
    load()
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

  function showDetails(property) {
    notify(`${property.address}: ${property.bedrooms ?? '-'} bed, ${property.bathrooms ?? '-'} bath, ${money(property.monthly_rent)} / month`)
  }

  async function openReports() {
    try {
      const result = await apiFetch('/api/reports/owner')
      const report = result.data.summary
      notify(`Occupancy ${report.occupancyRate}%: ${report.rentedProperties} of ${report.totalProperties} properties rented`)
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

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function closeModal() {
    setModalOpen(false)
    setFormError('')
  }

  async function createProperty(event) {
    event.preventDefault()
    setFormError('')
    const body = { address: form.address.trim(), monthlyRent: Number(form.monthlyRent) }
    if (form.propertyType.trim()) body.propertyType = form.propertyType.trim()
    if (form.bedrooms !== '') body.bedrooms = Number(form.bedrooms)
    if (form.bathrooms !== '') body.bathrooms = Number(form.bathrooms)

    setSaving(true)
    try {
      await apiFetch('/api/properties', { method: 'POST', body: JSON.stringify(body) })
      setForm(EMPTY_FORM)
      closeModal()
      notify('Property created')
      await load()
    } catch (err) {
      if (err.status === 401) handleError(err)
      else setFormError(err.message)
    } finally {
      setSaving(false)
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
      <PropertyGrid properties={active === 'Overview' ? filteredProperties.slice(0, 3) : filteredProperties} onDetails={showDetails} />
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

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'mobile-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Home size={17} /></div><span>Velora</span><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button></div>
        <div className="workspace-switcher"><div className="avatar avatar-brand">{user.username.slice(0, 2).toUpperCase()}</div><div><strong>{user.username}</strong><small>Property owner</small></div><ChevronDown size={16} /></div>
        <nav className="nav-list" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          {[['Overview', Home], ['Properties', Building2], ['Applications', ClipboardList], ['Tenants', Users], ['Payments', CircleDollarSign]].map(([label, Icon]) => <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => { setActive(label); setMenuOpen(false) }}><Icon size={18} /><span>{label}</span>{label === 'Applications' && pendingCount > 0 && <b>{pendingCount}</b>}</button>)}
          <p className="nav-label second">Manage</p>
          <button className="nav-item" onClick={openReports}><ClipboardList size={18} /><span>Reports</span></button>
          <button className="nav-item" onClick={() => notify('Settings are not available yet')}><Settings size={18} /><span>Settings</span></button>
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><ShieldCheck size={19} /><div><strong>Live data</strong><small>Connected to your database</small></div><span className="live-dot" /></div><button className="nav-item logout" onClick={onLogout}><LogOut size={18} /><span>Sign out</span></button></div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{active}</strong></div><div className="top-actions"><button className="icon-button" onClick={() => notify('Notifications are not available yet')} aria-label="Notifications"><Bell size={19} /><i /></button><div className="top-avatar">{user.username.slice(0, 2).toUpperCase()}</div></div></header>
        <div className="content">
          <div className="page-heading"><div><p className="eyebrow">{today}</p><h1>{greeting}, {user.username}<span className="heading-accent">.</span></h1><p className="heading-copy">Here&apos;s what&apos;s happening with your properties today.</p></div><button className="primary-button" onClick={() => setModalOpen(true)}><Plus size={18} /> Add property</button></div>
          {notice && <div className="toast"><ShieldCheck size={17} />{notice}</div>}
          {loading && <EmptyNote>Loading your data…</EmptyNote>}

          {active === 'Overview' && (
            <>
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon teal"><Building2 size={19} /></div><div><span>Total properties</span><strong>{summary.totalProperties ?? 0}</strong><small className="muted">Active listings</small></div><div className="sparkline teal-line" /></div>
                <div className="stat-card"><div className="stat-icon orange"><CircleDollarSign size={19} /></div><div><span>Monthly income</span><strong>{money(summary.monthlyIncome)}</strong><small className="muted">Completed payments this month</small></div><div className="sparkline orange-line" /></div>
                <div className="stat-card"><div className="stat-icon blue"><Users size={19} /></div><div><span>Active tenants</span><strong>{summary.activeTenants ?? 0}</strong><small className="muted">On active leases</small></div><div className="sparkline blue-line" /></div>
                <div className="stat-card"><div className="stat-icon brand"><ClipboardList size={19} /></div><div><span>Open applications</span><strong>{summary.openApplications ?? 0}</strong><small className="muted">Needs your review</small></div><div className="sparkline brand-line" /></div>
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
        </div>
      </section>

      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <form className="modal-card" onClick={(event) => event.stopPropagation()} onSubmit={createProperty}>
            <button type="button" className="modal-close" onClick={closeModal} aria-label="Close dialog"><X /></button>
            <div className="modal-icon"><Building2 /></div>
            <p className="eyebrow">Property setup</p>
            <h2>Add a new property</h2>
            <label>Address<input value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="e.g. 10 Example Road, Nairobi" required /></label>
            <label>Property type<input value={form.propertyType} onChange={(e) => updateForm('propertyType', e.target.value)} placeholder="e.g. Apartment" /></label>
            <label>Bedrooms<input type="number" min="0" step="1" value={form.bedrooms} onChange={(e) => updateForm('bedrooms', e.target.value)} placeholder="0" /></label>
            <label>Bathrooms<input type="number" min="0" step="1" value={form.bathrooms} onChange={(e) => updateForm('bathrooms', e.target.value)} placeholder="0" /></label>
            <label>Monthly rent<input type="number" min="0" step="0.01" value={form.monthlyRent} onChange={(e) => updateForm('monthlyRent', e.target.value)} placeholder="0.00" required /></label>
            {formError && <p role="alert" style={{ color: '#b42318', margin: 0 }}>{formError}</p>}
            <button className="primary-button full" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create property'}</button>
          </form>
        </div>
      )}
    </main>
  )
}


function NonOwnerNotice({ user, onLogout }) {
  const role = user.role.toLowerCase()
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420, display: 'grid', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Welcome, {user.username}</h1>
        <p style={{ margin: 0 }}>Your {role} account is ready. The {role} dashboard is coming soon.</p>
        <button className="primary-button" onClick={onLogout}>Sign out</button>
      </div>
    </main>
  )
}

export default function Page() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    apiFetch('/api/auth/session')
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false))
  }, [])

  async function handleLogout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // the server clears the cookie; ignore network errors here
    }
    setUser(null)
  }

  if (checking) {
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Loading…</main>
  }
  if (!user) return <AuthScreen onAuthed={setUser} />
  if (user.role !== 'Owner') return <NonOwnerNotice user={user} onLogout={handleLogout} />
  return <Dashboard user={user} onLogout={handleLogout} />
}