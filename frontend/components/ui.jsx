'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import './ui.css'

export function Field({ label, error, hint, required, children }) {
  return (
    <label className="ui-field">
      <span className="ui-label">{label}{required ? <span className="ui-req" aria-hidden="true"> *</span> : null}</span>
      {children}
      {error ? <span className="ui-error" role="alert">{error}</span> : hint ? <span className="ui-hint">{hint}</span> : null}
    </label>
  )
}

export function PasswordInput({ value, onChange, onBlur, autoComplete, required, minLength, invalid }) {
  const [shown, setShown] = useState(false)
  return (
    <span className="ui-password">
      <input className="ui-input" type={shown ? 'text' : 'password'} value={value} onChange={onChange} onBlur={onBlur} autoComplete={autoComplete} required={required} minLength={minLength} aria-invalid={invalid ? true : undefined} />
      <button type="button" className="ui-eye" onClick={() => setShown((current) => !current)} aria-label={shown ? 'Hide password' : 'Show password'}>{shown ? 'Hide' : 'Show'}</button>
    </span>
  )
}

export function Dialog({ title, subtitle, onClose, busy, children }) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  const busyRef = useRef(busy)
  closeRef.current = onClose
  busyRef.current = busy

  useEffect(() => {
    const previous = document.activeElement
    const previousOverflow = document.body.style.overflow
    const el = ref.current
    document.body.style.overflow = 'hidden'

    const target = el && (el.querySelector('[data-autofocus]') || el.querySelector('input, select, textarea') || el.querySelector('button:not(.ui-close)'))
    if (target) target.focus()

    function onKey(event) {
      if (event.key === 'Escape') {
        if (!busyRef.current) closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !el) return
      const nodes = el.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      if (previous && previous.focus) previous.focus()
    }
  }, [])

  return (
    <div className="ui-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <div className="ui-dialog" role="dialog" aria-modal="true" aria-labelledby="ui-dialog-title" ref={ref}>
        <div className="ui-dialog-head">
          <div><h2 id="ui-dialog-title">{title}</h2>{subtitle ? <p className="ui-sub">{subtitle}</p> : null}</div>
          <button type="button" className="ui-close" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, busy, onConfirm, onCancel }) {
  return (
    <Dialog title={title} onClose={onCancel} busy={busy}>
      <p className="ui-sub" style={{ margin: 0 }}>{message}</p>
      <div className="ui-dialog-actions">
        <button type="button" className="ui-btn ui-btn-ghost" data-autofocus onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={`ui-btn ${danger ? 'ui-btn-danger' : ''}`} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
      </div>
    </Dialog>
  )
}

function ToastIcon({ type }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      {type === 'error' ? <path d="M12 7.5v5M12 16.5v.01" /> : <path d="M8 12.5l2.7 2.7L16 9.5" />}
    </svg>
  )
}

export function Toasts({ items }) {
  return (
    <div className="ui-toasts" role="status" aria-live="polite">
      {items.map((toast) => <div key={toast.id} className={`ui-toast ${toast.type}`}><ToastIcon type={toast.type} /><span>{toast.message}</span></div>)}
    </div>
  )
}

export function useToasts() {
  const [toasts, setToasts] = useState([])
  const notify = useCallback((message, type = 'ok') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((current) => [...current.slice(-3), { id, message, type }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), type === 'error' ? 5000 : 3200)
  }, [])
  return [toasts, notify]
}

export function Skeleton({ rows = 3 }) {
  return <div className="ui-skel-list" aria-hidden="true">{Array.from({ length: rows }, (_, i) => <div className="ui-skel" key={i} />)}</div>
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="ui-empty">
      <strong>{title}</strong>
      {text ? <p>{text}</p> : null}
      {action || null}
    </div>
  )
}