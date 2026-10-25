'use client'

import { useEffect, useRef, useState } from 'react'
import { Home } from 'lucide-react'
import { apiFetch } from '../lib/api'
import './auth-screen.css'

const EMPTY = { username: '', password: '', email: '', phone: '', companyName: '', fullName: '', nationalId: '' }

// [hour, top colour, bottom colour]
const SKY = [
  [0, '#071c24', '#0f3440'],
  [5, '#123c4a', '#e9a37b'],
  [7, '#5fb3c4', '#f4dcb8'],
  [12, '#4aa3bf', '#cfe9ec'],
  [17, '#5aa0b8', '#f5d19a'],
  [19, '#26466a', '#e58f5a'],
  [21, '#0e2c3a', '#1b4a56'],
  [24, '#071c24', '#0f3440'],
]
const PRESETS = { dawn: 6.2, day: 12, dusk: 18.3, night: 23 }
const SLOTS = [[120, 690], [250, 682], [400, 682], [560, 670], [780, 646], [910, 634], [1040, 638]]
const STARS = Array.from({ length: 30 }, (_, i) => [(i * 197) % 1440, ((i * 83) % 320) + 20, i % 3 === 0 ? 1.8 : 1.2])
const FIREFLIES = [[300, 770], [520, 800], [760, 780], [980, 755], [1160, 785], [1300, 800]]

function toRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mix(a, b, t) {
  const x = toRgb(a)
  const y = toRgb(b)
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`
}

function skyColors(hour) {
  for (let i = 0; i < SKY.length - 1; i += 1) {
    const [h0, top0, bottom0] = SKY[i]
    const [h1, top1, bottom1] = SKY[i + 1]
    if (hour >= h0 && hour < h1) {
      const t = (hour - h0) / (h1 - h0)
      return [mix(top0, top1, t), mix(bottom0, bottom1, t)]
    }
  }
  return [SKY[0][1], SKY[0][2]]
}

function nightFactor(hour) {
  if (hour < 5 || hour >= 21) return 1
  if (hour < 7) return 1 - (hour - 5) / 2
  if (hour >= 19) return (hour - 19) / 2
  return 0
}

function arc(p) {
  return [160 + p * 1120, 560 - Math.sin(p * Math.PI) * 400]
}

function Landscape({ hour, houses }) {
  const [top, bottom] = skyColors(hour)
  const night = nightFactor(hour)
  const isDay = hour >= 5.5 && hour <= 18.5
  const sunP = isDay ? (hour - 5.5) / 13 : 0
  const moonP = (hour >= 18.5 ? hour - 18.5 : hour + 5.5) / 11
  const [bodyX, bodyY] = arc(isDay ? sunP : moonP)
  const sunColor = mix('#f08a4b', '#f7c35e', Math.sin(sunP * Math.PI))
  const slots = SLOTS.slice(0, houses)
  const glide = { transform: `translate(${bodyX}px, ${bodyY}px)`, transition: 'transform 20s linear' }

  return (
    <svg className="auth-landscape" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="auth-sky" x1="0" y1="0" x2="0" y2="1">
          <stop className="auth-sky-stop" offset="0" style={{ stopColor: top }} />
          <stop className="auth-sky-stop" offset="1" style={{ stopColor: bottom }} />
        </linearGradient>
        <radialGradient id="auth-sun-glow">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="auth-moon-glow">
          <stop offset="0" stopColor="#cfe8ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#cfe8ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1440" height="900" fill="url(#auth-sky)" />

      <g className="auth-fade" style={{ opacity: night * 0.9 }}>
        {STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#ffffff" />)}
      </g>

      <g style={glide}>
        <g className="auth-bob">
          {isDay ? (
            <>
              <circle r="170" fill="url(#auth-sun-glow)" />
              <circle r="60" fill={sunColor} />
            </>
          ) : (
            <>
              <circle r="130" fill="url(#auth-moon-glow)" />
              <circle r="40" fill="#fbf6e4" />
              <circle cx="-12" cy="-8" r="7" fill="#e6e0c8" opacity="0.6" />
              <circle cx="12" cy="10" r="5" fill="#e6e0c8" opacity="0.6" />
            </>
          )}
        </g>
      </g>

      <g className="auth-cloud auth-cloud-a" fill="#ffffff" opacity="0.9">
        <ellipse cx="200" cy="150" rx="74" ry="22" />
        <ellipse cx="252" cy="134" rx="52" ry="25" />
        <ellipse cx="160" cy="138" rx="40" ry="18" />
      </g>
      <g className="auth-cloud auth-cloud-b" fill="#ffffff" opacity="0.75">
        <ellipse cx="260" cy="260" rx="90" ry="26" />
        <ellipse cx="320" cy="242" rx="58" ry="28" />
        <ellipse cx="205" cy="248" rx="46" ry="20" />
      </g>
      <g className="auth-cloud auth-cloud-c" fill="#ffffff" opacity="0.65">
        <ellipse cx="240" cy="70" rx="64" ry="18" />
        <ellipse cx="282" cy="58" rx="42" ry="20" />
      </g>

      <g className="auth-fade" style={{ opacity: 1 - night }}>
        <g transform="translate(0,170)"><g className="auth-bird auth-bird-a"><path d="M0,0 q7,-8 14,0 q7,-8 14,0" fill="none" stroke="#14343a" strokeWidth="2" strokeLinecap="round" /></g></g>
        <g transform="translate(0,210)"><g className="auth-bird auth-bird-b"><path d="M0,0 q6,-7 12,0 q6,-7 12,0" fill="none" stroke="#14343a" strokeWidth="2" strokeLinecap="round" /></g></g>
        <g transform="translate(0,140)"><g className="auth-bird auth-bird-c"><path d="M0,0 q5,-6 10,0 q5,-6 10,0" fill="none" stroke="#14343a" strokeWidth="1.6" strokeLinecap="round" /></g></g>
      </g>

      <g className="auth-p auth-p-far"><path className="auth-hill-far" d="M-100,640 C100,570 300,610 520,575 S900,515 1120,560 S1400,610 1540,575 V900 H-100Z" fill="#7fb9bf" /></g>

      <g className="auth-p auth-p-mid">
        <path className="auth-hill-mid" d="M-100,720 C150,650 350,700 600,665 S950,610 1200,660 S1450,700 1540,670 V900 H-100Z" fill="#2f8591" />
        {slots.map(([x, y]) => (
          <g key={x} transform={`translate(${x},${y - 44}) scale(1.3)`}>
            <rect x="0" y="14" width="34" height="20" fill="#f3ece0" />
            <polygon points="-4,15 17,0 38,15" fill="#1b4752" />
          </g>
        ))}
      </g>

      <g className="auth-p auth-p-near">
        <path className="auth-hill-near" d="M-100,800 C200,740 420,790 700,760 S1080,720 1300,765 S1480,790 1540,770 V900 H-100Z" fill="#15616d" />
        <g className="auth-tree" transform="translate(1180,712)"><rect x="-4" y="30" width="8" height="24" fill="#3d3128" /><circle cx="0" cy="14" r="30" fill="#0e4a54" /></g>
        <g className="auth-tree auth-tree-b" transform="translate(1250,730)"><rect x="-3" y="22" width="6" height="18" fill="#3d3128" /><circle cx="0" cy="10" r="22" fill="#115b66" /></g>
        <g className="auth-tree auth-tree-c" transform="translate(90,770)"><rect x="-4" y="26" width="8" height="22" fill="#3d3128" /><circle cx="0" cy="12" r="26" fill="#0e4a54" /></g>
      </g>

      <rect className="auth-fade" width="1440" height="900" fill="#04141a" style={{ opacity: night * 0.35 }} />

      <g className="auth-p auth-p-mid">
        {slots.map(([x, y]) => (
          <g key={x} transform={`translate(${x},${y - 44}) scale(1.3)`}>
            <rect className="auth-fade" x="12" y="21" width="10" height="9" fill="#ffd98a" style={{ opacity: 0.2 + night * 0.8 }} />
          </g>
        ))}
      </g>

      <g className="auth-fade" style={{ opacity: night }}>
        {FIREFLIES.map(([x, y], i) => (
          <circle key={i} className="auth-firefly" cx={x} cy={y} r="2.6" fill="#ffe9a8" style={{ animationDelay: `${i * -0.7}s` }} />
        ))}
      </g>
    </svg>
  )
}

export default function AuthScreen({ onAuthed, initialMode = 'login', onBack }) {
  const [mode, setMode] = useState(initialMode)
  const [role, setRole] = useState('Owner')
  const [values, setValues] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [clock, setClock] = useState(null)
  const [preset, setPreset] = useState('live')
  const [homes, setHomes] = useState(null)
  const shellRef = useRef(null)

  const isRegister = mode === 'register'
  const liveHour = clock ? clock.getHours() + clock.getMinutes() / 60 : 12
  const hour = preset === 'live' ? liveHour : PRESETS[preset]
  const houses = Math.min(homes || 0, SLOTS.length)
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    const tick = () => setClock(new Date())
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await apiFetch('/api/public/properties')
        if (!cancelled) setHomes(result.data.length)
      } catch {
        // the scene still works without the live count
      }
    }
    load()
    const id = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    function onMove(event) {
      const el = shellRef.current
      if (!el) return
      el.style.setProperty('--mx', String((event.clientX / window.innerWidth - 0.5) * 2))
      el.style.setProperty('--my', String((event.clientY / window.innerHeight - 0.5) * 2))
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  function field(name) {
    return (event) => setValues((current) => ({ ...current, [name]: event.target.value }))
  }

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      let path = '/api/auth/login'
      let body = { username: values.username.trim(), password: values.password }

      if (isRegister) {
        path = '/api/auth/register'
        body = {
          username: values.username.trim(),
          password: values.password,
          role,
          email: values.email.trim(),
          phone: values.phone.trim(),
        }
        if (role === 'Owner') {
          if (values.companyName.trim()) body.companyName = values.companyName.trim()
        } else {
          body.fullName = values.fullName.trim()
          body.nationalId = values.nationalId.trim()
        }
      }

      const result = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) })
      onAuthed(result.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell" ref={shellRef}>
      <Landscape hour={hour} houses={houses} />

      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brandrow"><span className="auth-mark"><Home size={17} /></span><span>Velora</span></div>
        <div>
          <h1 className="auth-title">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
          <p className="auth-sub">{isRegister ? 'Register as an owner or a tenant to get started.' : `${greeting}. Sign in to manage properties, tenants and rent.`}</p>
          {homes !== null && (
            <p className="auth-live"><span className="auth-live-dot" />{homes === 0 ? 'No homes listed yet' : `${homes} ${homes === 1 ? 'home' : 'homes'} available right now`}</p>
          )}
        </div>
        {onBack && <button type="button" className="auth-back" onClick={onBack}>Back to listings</button>}

        <div className="auth-tabs" role="tablist" aria-label="Account">
          <button type="button" role="tab" className="auth-tab" aria-selected={!isRegister} onClick={() => switchMode('login')}>Sign in</button>
          <button type="button" role="tab" className="auth-tab" aria-selected={isRegister} onClick={() => switchMode('register')}>Register</button>
        </div>

        {isRegister && (
          <div className="auth-tabs" role="group" aria-label="Account type">
            <button type="button" className="auth-tab" aria-pressed={role === 'Owner'} onClick={() => setRole('Owner')}>Property owner</button>
            <button type="button" className="auth-tab" aria-pressed={role === 'Tenant'} onClick={() => setRole('Tenant')}>Tenant</button>
          </div>
        )}

        <label className="auth-field">Username
          <input value={values.username} onChange={field('username')} autoComplete="username" required />
        </label>
        <label className="auth-field">Password
          <input type="password" value={values.password} onChange={field('password')} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 8 : undefined} required />
        </label>

        {isRegister && (
          <>
            <label className="auth-field">Email
              <input type="email" value={values.email} onChange={field('email')} autoComplete="email" required />
            </label>
            <label className="auth-field">Phone
              <input type="tel" value={values.phone} onChange={field('phone')} autoComplete="tel" placeholder="0712345678" required />
            </label>
            {role === 'Owner' ? (
              <label className="auth-field">Company name (optional)
                <input value={values.companyName} onChange={field('companyName')} autoComplete="organization" />
              </label>
            ) : (
              <>
                <label className="auth-field">Full name
                  <input value={values.fullName} onChange={field('fullName')} autoComplete="name" required />
                </label>
                <label className="auth-field">ID number
                  <input value={values.nationalId} onChange={field('nationalId')} required />
                </label>
              </>
            )}
          </>
        )}

        {error && <p role="alert" className="auth-error">{error}</p>}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? (isRegister ? 'Creating account…' : 'Signing in…') : isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <div className="auth-time" role="group" aria-label="Time of day">
        {['live', 'dawn', 'day', 'dusk', 'night'].map((name) => (
          <button key={name} type="button" aria-pressed={preset === name} onClick={() => setPreset(name)}>{name === 'live' ? 'Live' : name[0].toUpperCase() + name.slice(1)}</button>
        ))}
      </div>
    </main>
  )
}