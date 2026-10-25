'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import { formatDate, initialsOf, money } from '../lib/format'
import AuthScreen from '../components/auth-screen'
import PublicHome from '../components/public-home'
import TenantDashboard from '../components/tenant-dashboard'
import SettingsPanel from '../components/settings-panel'
import { ConfirmDialog, Dialog, EmptyState, Skeleton, Toasts, useToasts } from '../components/ui'
import { LeaseForm, PropertyForm } from '../components/forms'
import { Bell, Building2, ChevronDown, CircleDollarSign, ClipboardList, FileText, Home, LogOut, Menu, Plus, Search, Settings, ShieldCheck, Users, X } from 'lucide-react'

const ACCENTS = ['teal', 'orange', 'blue']
const MAIN_NAV = [['Overview', Home], ['Properties', Building2], ['Applications', ClipboardList], ['Tenants', Users], ['Leases', FileText], ['Payments', CircleDollarSign]]
const BLANK_PROPERTY = { address: '', propertyType: '', bedrooms: '', bathrooms: '', monthlyRent: '', status: 'Available' }

function isoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function StatusPill({ children }) {
  const tone = ['Approved', 'Available', 'Complete', 'Active'].includes(children) ? 'success' : ['Pending', 'Draft', 'Review'].includes(children) ? 'warning' : 'neutral'
  return <span className={`status-pill ${tone}`}><span className="status-dot" />{children}</span>
}

function PropertyVisual({ accent }) {
  return <div className={`property-visual ${accent}`}><Building2 size={28} strokeWidth={1.5} /><span>Property preview</span></div>
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

function PropertyGrid({ properties, busy, onEdit, onRemove, onAdd, searching }) {
  if (properties.length === 0) {
    return searching
      ? <EmptyState title="No matches" text="No property matches your search. Try a different address or type." />
      : <EmptyState title="No properties yet" text="Add your first property and it will appear here and on the public listings page." action={<button className="ui-btn" onClick={onAdd}>Add property</button>} />
  }
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
                <span className="ui-actions">
                  <button className="ui-btn ui-btn-sm ui-btn-ghost" disabled={busy} onClick={() => onEdit(property)}>Edit</button>
                  <button className="ui-btn ui-btn-sm ui-btn-outline-danger" disabled={busy} onClick={() => onRemove(property)}>Remove</button>
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

function ApplicationList({ applications, leasedIds, busy, onApprove, onReject, onCreateLease }) {
  if (applications.length === 0) return <EmptyState title="No applications yet" text="When a tenant applies for one of your homes, the application shows up here within seconds." />
  return (
    <div className="application-list">
      {applications.map((application) => (
        <div className="application-row" key={application.rental_application_id}>
          <div className="avatar avatar-soft">{initialsOf(application.tenant_name)}</div>
          <div className="application-info"><strong>{application.tenant_name}</strong><span>{application.address}</span></div>
          <span className="application-date">{formatDate(application.application_date)}</span>
          <StatusPill>{application.status}</StatusPill>
          {application.status === 'Pending' && (
            <span className="ui-actions">
              <button className="ui-btn ui-btn-sm ui-btn-ok" disabled={busy} onClick={() => onApprove(application)}>Approve</button>
              <button className="ui-btn ui-btn-sm ui-btn-outline-danger" disabled={busy} onClick={() => onReject(application)}>Reject</button>
            </span>
          )}
          {application.status === 'Approved' && (leasedIds.has(application.rental_application_id)
            ? <span className="ui-chip">Lease created</span>
            : <button className="ui-btn ui-btn-sm" disabled={busy} onClick={() => onCreateLease(application)}>Create lease</button>)}
        </div>
      ))}
    </div>
  )
}

function TenantList({ tenants }) {
  if (tenants.length === 0) return <EmptyState title="No tenants yet" text="Tenants appear here once a lease for one of your properties is active." />
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

function LeaseList({ leases, busy, onActivate, onEnd }) {
  if (leases.length === 0) return <EmptyState title="No leases yet" text="Approve an application, then choose Create lease to start one." />
  return (
    <div className="application-list">
      {leases.map((lease) => (
        <div className="application-row" key={lease.lease_id}>
          <div className="avatar avatar-soft">{initialsOf(lease.tenant_name)}</div>
          <div className="application-info"><strong>{lease.tenant_name}</strong><span>{lease.address} · {formatDate(lease.start_date)} to {formatDate(lease.end_date)}</span></div>
          <span className="application-date">{money(lease.monthly_rent)} / month</span>
          <StatusPill>{lease.status}</StatusPill>
          {lease.status === 'Draft' && <button className="ui-btn ui-btn-sm ui-btn-ok" disabled={busy} onClick={() => onActivate(lease)}>Activate</button>}
          {lease.status === 'Active' && <button className="ui-btn ui-btn-sm ui-btn-outline-danger" disabled={busy} onClick={() => onEnd(lease)}>End lease</button>}
        </div>
      ))}
    </div>
  )
}

function PaymentList({ payments }) {
  if (payments.length === 0) return <EmptyState title="No payments yet" text="Completed rent payments will be listed here." />
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
  if (!report) return <Skeleton rows={4} />
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
        {report.properties.length === 0 ? <EmptyState title="No properties yet" /> : (
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [data, setData] = useState({ summary: null, properties: [], applications: [], tenants: [], payments: [], leases: [], report: null })
  const [propertyDialog, setPropertyDialog] = useState(null)
  const [leaseDialog, setLeaseDialog] = useState(null)
  const [dialogSaving, setDialogSaving] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toasts, notify] = useToasts()

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
      const [summary, properties, applications, tenants, payments, leases, report] = await Promise.all([
        apiFetch('/api/dashboard/summary'),
        apiFetch('/api/properties'),
        apiFetch('/api/applications'),
        apiFetch('/api/tenants'),
        apiFetch('/api/payments'),
        apiFetch('/api/leases'),
        apiFetch('/api/reports/owner'),
      ])
      setData({ summary, properties: properties.data, applications: applications.data, tenants: tenants.data, payments: payments.data, leases: leases.data, report: report.data })
      setLoadError('')
    } catch (err) {
      if (err.status === 401) logoutRef.current()
      else setLoadError(err.message || 'Could not load your data')
    } finally {
      setLoading(false)
    }
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

  const summary = data.summary || {}
  const firstLoad = loading && !data.summary
  const pendingCount = data.applications.filter((application) => application.status === 'Pending').length
  const leasedIds = useMemo(() => new Set(data.leases.map((lease) => lease.rental_application_id)), [data.leases])

  const filteredProperties = useMemo(() => {
    const needle = query.trim().toLowerCase()
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

  async function act(fn) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      handleError(err)
    } finally {
      setBusy(false)
    }
  }

  function openCreateProperty() {
    setDialogError('')
    setPropertyDialog({ mode: 'create', initial: BLANK_PROPERTY })
  }

  function openEditProperty(property) {
    setDialogError('')
    setPropertyDialog({
      mode: 'edit',
      id: property.property_id,
      initial: {
        address: property.address,
        propertyType: property.property_type || '',
        bedrooms: property.bedrooms == null ? '' : String(property.bedrooms),
        bathrooms: property.bathrooms == null ? '' : String(property.bathrooms),
        monthlyRent: String(property.monthly_rent),
        status: property.status === 'Rented' ? 'Rented' : 'Available',
      },
    })
  }

  async function submitProperty(values) {
    const editing = propertyDialog.mode === 'edit'
    const body = { address: values.address.trim(), monthlyRent: Number(values.monthlyRent) }
    if (editing) {
      body.propertyType = values.propertyType.trim() || null
      body.bedrooms = values.bedrooms === '' ? null : Number(values.bedrooms)
      body.bathrooms = values.bathrooms === '' ? null : Number(values.bathrooms)
      body.status = values.status
    } else {
      if (values.propertyType.trim()) body.propertyType = values.propertyType.trim()
      if (values.bedrooms !== '') body.bedrooms = Number(values.bedrooms)
      if (values.bathrooms !== '') body.bathrooms = Number(values.bathrooms)
    }
    setDialogSaving(true)
    setDialogError('')
    try {
      await apiFetch(editing ? `/api/properties/${propertyDialog.id}` : '/api/properties', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      })
      setPropertyDialog(null)
      notify(editing ? 'Property updated' : 'Property created')
      await load()
    } catch (err) {
      if (err.status === 401) handleError(err)
      else setDialogError(err.message)
    } finally {
      setDialogSaving(false)
    }
  }

  function askRemoveProperty(property) {
    setConfirm({
      title: 'Remove this property?',
      message: `${property.address} will no longer be listed. Properties with an active lease cannot be removed.`,
      confirmLabel: 'Remove property',
      danger: true,
      action: async () => {
        await apiFetch(`/api/properties/${property.property_id}`, { method: 'DELETE' })
        notify('Property removed')
        await load()
      },
    })
  }

  function approveApplication(application) {
    act(async () => {
      await apiFetch(`/api/applications/${application.rental_application_id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Approved' }) })
      notify(`Approved ${application.tenant_name}. You can now create a lease.`)
      await load()
    })
  }

  function askRejectApplication(application) {
    setConfirm({
      title: 'Reject this application?',
      message: `${application.tenant_name}'s application for ${application.address} will be marked as rejected. This cannot be undone.`,
      confirmLabel: 'Reject application',
      danger: true,
      action: async () => {
        await apiFetch(`/api/applications/${application.rental_application_id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Rejected' }) })
        notify('Application rejected')
        await load()
      },
    })
  }

  function openCreateLease(application) {
    const start = new Date()
    const end = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate())
    setDialogError('')
    setLeaseDialog({
      application,
      initial: { startDate: isoDate(start), endDate: isoDate(end), monthlyRent: String(application.monthly_rent) },
    })
  }

  async function submitLease(values) {
    setDialogSaving(true)
    setDialogError('')
    try {
      await apiFetch('/api/leases', {
        method: 'POST',
        body: JSON.stringify({
          applicationId: leaseDialog.application.rental_application_id,
          startDate: values.startDate,
          endDate: values.endDate,
          monthlyRent: Number(values.monthlyRent),
        }),
      })
      setLeaseDialog(null)
      notify('Lease created as a draft. Activate it once it is signed.')
      await load()
      setActive('Leases')
    } catch (err) {
      if (err.status === 401) handleError(err)
      else setDialogError(err.message)
    } finally {
      setDialogSaving(false)
    }
  }

  function askActivateLease(lease) {
    setConfirm({
      title: 'Activate this lease?',
      message: `${lease.tenant_name} will become an active tenant at ${lease.address}, and the property will be marked as rented.`,
      confirmLabel: 'Activate lease',
      danger: false,
      action: async () => {
        await apiFetch(`/api/leases/${lease.lease_id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Active' }) })
        notify('Lease activated')
        await load()
      },
    })
  }

  function askEndLease(lease) {
    setConfirm({
      title: 'End this lease?',
      message: `${lease.tenant_name}'s lease at ${lease.address} will end and the property becomes available again.`,
      confirmLabel: 'End lease',
      danger: true,
      action: async () => {
        await apiFetch(`/api/leases/${lease.lease_id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Ended' }) })
        notify('Lease ended')
        await load()
      },
    })
  }

  async function runConfirm() {
    if (!confirm) return
    setConfirmBusy(true)
    try {
      await confirm.action()
    } catch (err) {
      handleError(err)
    } finally {
      setConfirmBusy(false)
      setConfirm(null)
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
      <PropertyGrid
        properties={active === 'Overview' ? filteredProperties.slice(0, 3) : filteredProperties}
        busy={busy}
        searching={query.trim() !== ''}
        onAdd={openCreateProperty}
        onEdit={openEditProperty}
        onRemove={askRemoveProperty}
      />
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
        {limit ? <button className="text-button" onClick={() => setActive('Applications')}>View all <span>→</span></button> : null}
      </div>
      <ApplicationList
        applications={limit ? data.applications.slice(0, limit) : data.applications}
        leasedIds={leasedIds}
        busy={busy}
        onApprove={approveApplication}
        onReject={askRejectApplication}
        onCreateLease={openCreateLease}
      />
    </section>
  )

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
        <header className="topbar"><button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{active}</strong></div><div className="top-actions"><button className="icon-button" onClick={() => notify(pendingCount ? `${pendingCount} ${pendingCount === 1 ? 'application is' : 'applications are'} waiting for your review` : 'You are all caught up')} aria-label="Notifications"><Bell size={19} />{pendingCount > 0 && <i />}</button><div className="top-avatar">{initials}</div></div></header>
        <div className="content">
          <div className="page-heading"><div><p className="eyebrow">{today}</p><h1>{greeting}, {user.username}<span className="heading-accent">.</span></h1><p className="heading-copy">Here&apos;s what&apos;s happening with your properties today.</p></div><button className="primary-button" onClick={openCreateProperty}><Plus size={18} /> Add property</button></div>

          {loadError && (
            <div className="ui-banner error ui-banner-row" role="alert">
              <span>{loadError}. We will keep trying automatically.</span>
              <button className="ui-btn ui-btn-sm ui-btn-ghost" onClick={load}>Retry now</button>
            </div>
          )}

          {firstLoad ? <Skeleton rows={5} /> : (
            <>
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
              {active === 'Leases' && (
                <section className="panel-card">
                  <div className="panel-heading"><div><h2>Leases</h2><p>Create a lease from an approved application, then activate it once signed.</p></div></div>
                  <LeaseList leases={data.leases} busy={busy} onActivate={askActivateLease} onEnd={askEndLease} />
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
            </>
          )}
        </div>
      </section>

      {propertyDialog && (
        <Dialog
          title={propertyDialog.mode === 'edit' ? 'Edit property' : 'Add a new property'}
          subtitle={propertyDialog.mode === 'edit' ? 'Changes appear on the public listings straight away.' : 'It will be listed as Available.'}
          busy={dialogSaving}
          onClose={() => setPropertyDialog(null)}
        >
          <PropertyForm mode={propertyDialog.mode} initial={propertyDialog.initial} saving={dialogSaving} serverError={dialogError} onSubmit={submitProperty} onCancel={() => setPropertyDialog(null)} />
        </Dialog>
      )}

      {leaseDialog && (
        <Dialog
          title="Create a lease"
          subtitle={`${leaseDialog.application.tenant_name} at ${leaseDialog.application.address}`}
          busy={dialogSaving}
          onClose={() => setLeaseDialog(null)}
        >
          <LeaseForm initial={leaseDialog.initial} saving={dialogSaving} serverError={dialogError} onSubmit={submitLease} onCancel={() => setLeaseDialog(null)} />
        </Dialog>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          busy={confirmBusy}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <Toasts items={toasts} />
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