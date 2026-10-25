'use client'

import { useState } from 'react'
import { apiFetch } from '../lib/api'
import './auth-screen.css'

const EMPTY = { username: '', password: '', email: '', phone: '', companyName: '', fullName: '', nationalId: '' }

function Landscape() {
  return (
    <svg className="auth-landscape" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="auth-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8cc8de" />
          <stop offset="0.65" stopColor="#d9ecee" />
          <stop offset="1" stopColor="#f6e8c9" />
        </linearGradient>
        <radialGradient id="auth-sun-glow">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#auth-sky)" />

      <g className="auth-sun">
        <circle cx="1120" cy="250" r="170" fill="url(#auth-sun-glow)" />
        <circle cx="1120" cy="250" r="62" fill="#f6c667" />
      </g>

      <g className="auth-cloud auth-cloud-a" fill="#ffffff" opacity="0.92">
        <ellipse cx="200" cy="150" rx="74" ry="22" />
        <ellipse cx="252" cy="134" rx="52" ry="25" />
        <ellipse cx="160" cy="138" rx="40" ry="18" />
      </g>
      <g className="auth-cloud auth-cloud-b" fill="#ffffff" opacity="0.8">
        <ellipse cx="260" cy="260" rx="90" ry="26" />
        <ellipse cx="320" cy="242" rx="58" ry="28" />
        <ellipse cx="205" cy="248" rx="46" ry="20" />
      </g>
      <g className="auth-cloud auth-cloud-c" fill="#ffffff" opacity="0.7">
        <ellipse cx="240" cy="70" rx="64" ry="18" />
        <ellipse cx="282" cy="58" rx="42" ry="20" />
      </g>

      <path className="auth-hill-far" d="M-100,640 C100,570 300,610 520,575 S900,515 1120,560 S1400,610 1540,575 V900 H-100Z" fill="#8fc0b0" />
      <path className="auth-hill-mid" d="M-100,720 C150,650 350,700 600,665 S950,610 1200,660 S1450,700 1540,670 V900 H-100Z" fill="#4f9a82" />

      <g transform="translate(250,612)">
        <rect x="0" y="30" width="60" height="44" fill="#f5efe3" />
        <polygon points="-6,32 30,2 66,32" fill="#264653" />
        <rect className="auth-window" x="22" y="46" width="16" height="16" fill="#ffd98a" />
      </g>

      <path className="auth-hill-near" d="M-100,800 C200,740 420,790 700,760 S1080,720 1300,765 S1480,790 1540,770 V900 H-100Z" fill="#2e7a68" />

      <g className="auth-tree" transform="translate(1180,712)">
        <rect x="-4" y="30" width="8" height="24" fill="#4a3b2e" />
        <circle cx="0" cy="14" r="30" fill="#1f5c4e" />
      </g>
      <g className="auth-tree auth-tree-b" transform="translate(1250,730)">
        <rect x="-3" y="22" width="6" height="18" fill="#4a3b2e" />
        <circle cx="0" cy="10" r="22" fill="#256b59" />
      </g>
    </svg>
  )
}

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('Owner')
  const [values, setValues] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isRegister = mode === 'register'

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
    <main className="auth-shell">
      <Landscape />
      <form className="auth-card" onSubmit={handleSubmit}>
        <div>
          <p className="auth-brand">Velora</p>
          <h1 className="auth-title">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
          <p className="auth-sub">{isRegister ? 'Register as an owner or a tenant to get started.' : 'Sign in to manage properties, tenants and rent.'}</p>
        </div>

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
    </main>
  )
}