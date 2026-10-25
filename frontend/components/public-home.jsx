'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, Building2, Home, Search } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { money } from '../lib/format'
import './public-home.css'

const ACCENTS = ['teal', 'orange', 'blue']

function useCountUp(target) {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const from = fromRef.current
    let frame
    function step(now) {
      const t = Math.min(1, (now - start) / 900)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) frame = requestAnimationFrame(step)
      else fromRef.current = target
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target])
  return value
}

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return undefined
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShown(true)
        observer.disconnect()
      }
    }, { threshold: 0.12 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={`home-reveal ${shown ? 'in' : ''}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>
}

export function ListingGrid({ properties, renderAction }) {
  if (properties.length === 0) return <p className="home-empty">No available properties match your search.</p>
  return (
    <div className="home-grid">
      {properties.map((property, index) => {
        const details = [property.bedrooms != null && `${property.bedrooms} bed`, property.bathrooms != null && `${property.bathrooms} bath`].filter(Boolean).join(', ')
        return (
          <Reveal key={property.property_id} delay={Math.min(index, 8) * 60}>
            <article className="property-card">
              <div className={`property-visual ${ACCENTS[index % ACCENTS.length]}`}><Building2 size={28} strokeWidth={1.5} /><span>Property preview</span></div>
              <div className="property-body">
                <h3>{property.address}</h3>
                <p>{details || 'No room details yet'}</p>
                <div className="property-meta"><span>{property.property_type || 'Property'}</span><strong>{money(property.monthly_rent)}<small>/ month</small></strong></div>
                {renderAction ? renderAction(property) : null}
              </div>
            </article>
          </Reveal>
        )
      })}
    </div>
  )
}

export default function PublicHome({ user, onSignIn, onRegister, onLogout }) {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All')
  const [sort, setSort] = useState('newest')
  const [scrolled, setScrolled] = useState(false)
  const heroRef = useRef(null)
  const listingsRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await apiFetch('/api/public/properties')
        if (!cancelled) {
          setProperties(result.data)
          setError('')
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const id = setInterval(() => {
      if (!document.hidden) load()
    }, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        setScrolled(window.scrollY > 60)
        if (!reduce && heroRef.current) heroRef.current.style.setProperty('--scroll', String(Math.min(window.scrollY, 900)))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const types = useMemo(() => ['All', ...Array.from(new Set(properties.map((p) => p.property_type).filter(Boolean)))], [properties])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = properties.filter((p) => (type === 'All' || p.property_type === type) && `${p.address} ${p.property_type || ''}`.toLowerCase().includes(needle))
    if (sort === 'low') return [...list].sort((a, b) => a.monthly_rent - b.monthly_rent)
    if (sort === 'high') return [...list].sort((a, b) => b.monthly_rent - a.monthly_rent)
    return list
  }, [properties, query, type, sort])

  const rents = properties.map((p) => Number(p.monthly_rent)).filter((n) => Number.isFinite(n))
  const average = rents.length ? Math.round(rents.reduce((sum, n) => sum + n, 0) / rents.length) : 0
  const cheapest = rents.length ? Math.min(...rents) : 0
  const homesShown = useCountUp(properties.length)
  const averageShown = useCountUp(average)
  const cheapestShown = useCountUp(cheapest)

  function scrollToListings() {
    if (listingsRef.current) listingsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="home-shell">
      <header className={`home-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="home-brand"><span className="home-mark"><Home size={16} /></span> Velora</div>
        <div className="home-actions">
          {user ? (
            <>
              <span className="home-user">Signed in as {user.username}</span>
              <button type="button" className="home-btn" onClick={onLogout}>Sign out</button>
            </>
          ) : (
            <>
              <button type="button" className="home-btn" onClick={onSignIn}>Sign in</button>
              <button type="button" className="home-btn home-btn-primary" onClick={onRegister}>Register</button>
            </>
          )}
        </div>
      </header>

      <section className="home-hero" ref={heroRef}>
        <div className="home-photo-wrap"><div className="home-photo" /></div>
        <div className="home-hero-content">
          <p className="home-live"><span className="home-live-dot" />{loading ? 'Loading homes…' : `${properties.length} ${properties.length === 1 ? 'home' : 'homes'} available right now`}</p>
          <h1>Find a place to call home</h1>
          <p className="home-lead">Browse available properties, apply online and manage your tenancy in one place.</p>
          <form className="home-search" onSubmit={(event) => { event.preventDefault(); scrollToListings() }}>
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by address or type" aria-label="Search available properties" />
            <button type="submit">Search</button>
          </form>
          <div className="home-stats">
            <div><strong>{homesShown}</strong><span>Homes available</span></div>
            <div><strong>{money(averageShown)}</strong><span>Average rent / month</span></div>
            <div><strong>{money(cheapestShown)}</strong><span>Starting from</span></div>
          </div>
          {!user && (
            <div className="home-cta">
              <button type="button" className="home-btn-hero" onClick={onRegister}>Create an account</button>
              <button type="button" className="home-btn-ghost" onClick={onSignIn}>Sign in</button>
            </div>
          )}
        </div>
        <button type="button" className="home-scroll" onClick={scrollToListings} aria-label="Browse homes"><ArrowDown size={20} /></button>
      </section>

      <section className="home-section" ref={listingsRef}>
        <div className="home-section-head">
          <div><h2>Available homes</h2><p>Updated automatically as owners list or rent out properties.</p></div>
          <label className="home-sort">Sort by
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">Newest</option>
              <option value="low">Rent: low to high</option>
              <option value="high">Rent: high to low</option>
            </select>
          </label>
        </div>
        <div className="home-chips" role="group" aria-label="Property type">
          {types.map((name) => <button key={name} type="button" className="home-chip" aria-pressed={type === name} onClick={() => setType(name)}>{name}</button>)}
        </div>
        {error && <p role="alert" className="home-error">{error}</p>}
        {loading ? <p className="home-empty">Loading properties…</p> : (
          <ListingGrid
            properties={visible}
            renderAction={user ? null : () => <button type="button" className="home-card-action" onClick={onSignIn}>Sign in to apply</button>}
          />
        )}
      </section>

      <footer className="home-footer">Velora property rental management</footer>
    </div>
  )
}