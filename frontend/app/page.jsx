'use client'

import { useMemo, useState } from 'react'
import { Bell, Building2, ChevronDown, CircleDollarSign, ClipboardList, Home, LogOut, Menu, Plus, Search, Settings, ShieldCheck, Users, X } from 'lucide-react'

const properties = [
  { name: 'Harbor Point Apartments', location: 'Cape Town, Western Cape', type: 'Apartment', rent: 'R18,500', status: 'Available', accent: 'teal' },
  { name: 'Oak & Stone House', location: 'Johannesburg, Gauteng', type: 'House', rent: 'R24,000', status: 'Rented', accent: 'orange' },
  { name: 'The Foundry Lofts', location: 'Durban, KwaZulu-Natal', type: 'Loft', rent: 'R16,800', status: 'Available', accent: 'blue' },
]

const applications = [
  { name: 'Thandi Mokoena', property: 'Harbor Point Apartments', date: '18 Oct 2026', status: 'Pending', initials: 'TM' },
  { name: 'Liam van Wyk', property: 'Oak & Stone House', date: '16 Oct 2026', status: 'Approved', initials: 'LV' },
  { name: 'Nomsa Dlamini', property: 'The Foundry Lofts', date: '14 Oct 2026', status: 'Review', initials: 'ND' },
]

function StatusPill({ children }) {
  const tone = children === 'Approved' || children === 'Available' ? 'success' : children === 'Pending' || children === 'Review' ? 'warning' : 'neutral'
  return <span className={`status-pill ${tone}`}><span className="status-dot" />{children}</span>
}

function PropertyVisual({ accent }) {
  return <div className={`property-visual ${accent}`}><Building2 size={28} strokeWidth={1.5} /><span>Property preview</span></div>
}

export default function Page() {
  const [active, setActive] = useState('Overview')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const filteredProperties = useMemo(() => properties.filter((property) => `${property.name} ${property.location}`.toLowerCase().includes(query.toLowerCase())), [query])

  function runDemo(label) {
    setNotice(`${label} demo endpoint ready — connected to mock API.`)
    window.setTimeout(() => setNotice(''), 3200)
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'mobile-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Home size={17} /></div><span>Velora</span><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button></div>
        <div className="workspace-switcher"><div className="avatar avatar-brand">AM</div><div><strong>Alma Mutuguti</strong><small>Property owner</small></div><ChevronDown size={16} /></div>
        <nav className="nav-list" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          {[['Overview', Home], ['Properties', Building2], ['Applications', ClipboardList], ['Tenants', Users], ['Payments', CircleDollarSign]].map(([label, Icon]) => <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => { setActive(label); setMenuOpen(false) }}><Icon size={18} /><span>{label}</span>{label === 'Applications' && <b>3</b>}</button>)}
          <p className="nav-label second">Manage</p>
          <button className="nav-item" onClick={() => runDemo('Reports')}><ClipboardList size={18} /><span>Reports</span></button>
          <button className="nav-item" onClick={() => runDemo('Settings')}><Settings size={18} /><span>Settings</span></button>
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><ShieldCheck size={19} /><div><strong>API demo mode</strong><small>Safe placeholder data</small></div><span className="live-dot" /></div><button className="nav-item logout" onClick={() => runDemo('Logout')}><LogOut size={18} /><span>Sign out</span></button></div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{active}</strong></div><div className="top-actions"><button className="icon-button" onClick={() => runDemo('Notifications')} aria-label="Notifications"><Bell size={19} /><i /></button><div className="top-avatar">AM</div></div></header>
        <div className="content">
          <div className="page-heading"><div><p className="eyebrow">Saturday, 19 October 2026</p><h1>Good morning, Alma<span className="heading-accent">.</span></h1><p className="heading-copy">Here&apos;s what&apos;s happening with your properties today.</p></div><button className="primary-button" onClick={() => setModalOpen(true)}><Plus size={18} /> Add property</button></div>
          {notice && <div className="toast"><ShieldCheck size={17} />{notice}</div>}
          <div className="stats-grid"><div className="stat-card"><div className="stat-icon teal"><Building2 size={19} /></div><div><span>Total properties</span><strong>12</strong><small className="positive">+2 this month</small></div><div className="sparkline teal-line" /></div><div className="stat-card"><div className="stat-icon orange"><CircleDollarSign size={19} /></div><div><span>Monthly income</span><strong>R184,200</strong><small className="positive">+8.4% vs last month</small></div><div className="sparkline orange-line" /></div><div className="stat-card"><div className="stat-icon blue"><Users size={19} /></div><div><span>Active tenants</span><strong>28</strong><small className="positive">+3 this month</small></div><div className="sparkline blue-line" /></div><div className="stat-card"><div className="stat-icon brand"><ClipboardList size={19} /></div><div><span>Open applications</span><strong>3</strong><small className="muted">Needs your review</small></div><div className="sparkline brand-line" /></div></div>
          <div className="section-row"><div><h2>Property portfolio</h2><p>Keep track of your listings and occupancy.</p></div><div className="section-actions"><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search properties" aria-label="Search properties" /></div><button className="text-button" onClick={() => setActive('Properties')}>View all <span>→</span></button></div></div>
          <div className="property-grid">{filteredProperties.map((property) => <article className="property-card" key={property.name}><PropertyVisual accent={property.accent} /><div className="property-body"><div className="property-top"><StatusPill>{property.status}</StatusPill><button className="more-button" onClick={() => runDemo(`${property.name} details`)} aria-label={`View ${property.name} details`}>•••</button></div><h3>{property.name}</h3><p>{property.location}</p><div className="property-meta"><span>{property.type}</span><strong>{property.rent}<small>/ month</small></strong></div></div></article>)}</div>
          <div className="lower-grid"><section className="panel-card"><div className="panel-heading"><div><h2>Recent applications</h2><p>Review and manage tenant applications.</p></div><button className="text-button" onClick={() => setActive('Applications')}>View all <span>→</span></button></div><div className="application-list">{applications.map((application) => <div className="application-row" key={application.name}><div className="avatar avatar-soft">{application.initials}</div><div className="application-info"><strong>{application.name}</strong><span>{application.property}</span></div><span className="application-date">{application.date}</span><StatusPill>{application.status}</StatusPill><button className="row-arrow" onClick={() => runDemo(`${application.name} application`)} aria-label={`Open ${application.name} application`}>→</button></div>)}</div></section><section className="panel-card insights"><div className="panel-heading"><div><h2>Income overview</h2><p>Monthly rental income, 2026.</p></div><button className="select-button" onClick={() => runDemo('Income filter')}>2026 <ChevronDown size={15} /></button></div><div className="income-total"><strong>R184,200</strong><span className="positive">+8.4%</span></div><div className="chart"><div className="chart-lines"><span /><span /><span /><span /></div><svg viewBox="0 0 440 120" preserveAspectRatio="none" aria-label="Income chart"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#15616d" stopOpacity=".24" /><stop offset="1" stopColor="#15616d" stopOpacity="0" /></linearGradient></defs><path d="M0,93 C35,85 48,78 76,82 S120,67 145,70 S181,50 208,62 S245,35 275,48 S310,40 336,43 S370,25 395,35 S420,20 440,25 V120 H0Z" fill="url(#fill)" /><path d="M0,93 C35,85 48,78 76,82 S120,67 145,70 S181,50 208,62 S245,35 275,48 S310,40 336,43 S370,25 395,35 S420,20 440,25" fill="none" stroke="#15616d" strokeWidth="3" /></svg><div className="chart-labels"><span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span></div></div></section></div>
        </div>
      </section>
      {modalOpen && <div className="modal-backdrop" onClick={() => setModalOpen(false)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Close dialog"><X /></button><div className="modal-icon"><Building2 /></div><p className="eyebrow">Property setup</p><h2>Add a new property</h2><p>This API demo will connect to <code>POST /api/properties</code> when your backend is ready.</p><label>Property name<input placeholder="e.g. The Willow Estate" /></label><label>Monthly rent<input placeholder="R 0.00" /></label><button className="primary-button full" onClick={() => { setModalOpen(false); runDemo('Create property') }}>Create property <span>→</span></button></div></div>}
    </main>
  )
}
