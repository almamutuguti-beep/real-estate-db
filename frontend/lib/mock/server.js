import { createSeed, seedPayments, DEMO_PASSWORD } from './data'

// In-browser stand-in for the Express API. Every route here mirrors one in
// backend/routes/*.js and returns the same response shape, so the UI works
// unchanged once NEXT_PUBLIC_API_MODE=live points it at the real backend.

const SESSION_KEY = 'velora-demo-user'
let db = seedPayments(createSeed())

class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
const fail = (status, message) => {
  throw new ApiError(status, message)
}

function sessionUser() {
  if (typeof window === 'undefined') return null
  const id = Number(window.sessionStorage.getItem(SESSION_KEY))
  return db.users.find((u) => u.user_id === id && u.is_active) || null
}
const publicUser = (u) => ({ userId: u.user_id, username: u.username, role: u.role, isVerified: !!u.is_verified })
const nextId = () => ++db.nextId
const byId = (list, key, id) => list.find((r) => r[key] === Number(id))
const property = (id) => byId(db.properties, 'property_id', id)
const tenant = (id) => byId(db.tenants, 'tenant_id', id)
const worker = (id) => byId(db.workers, 'worker_id', id)
const desc = (key) => (a, b) => new Date(b[key]) - new Date(a[key])
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)

function monthSeries(payments) {
  const now = new Date()
  const series = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const amount = payments
      .filter((p) => {
        const pd = new Date(p.payment_date)
        return p.status === 'Complete' && pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth()
      })
      .reduce((s, p) => s + Number(p.amount), 0)
    series.push({ month: d.toLocaleString('en-US', { month: 'short' }), amount })
  }
  return series
}

function profileFor(user) {
  const map = { Owner: db.owners, Tenant: db.tenants, Agent: db.agents, Worker: db.workers }
  const row = (map[user.role] || []).find((r) => r.user_id === user.user_id)
  if (!row) return {}
  return {
    fullName: row.full_name || row.company_name,
    phone: row.phone,
    email: row.email,
    specialty: row.specialty,
  }
}

function requireRole(role) {
  const user = sessionUser()
  if (!user) fail(401, 'Not authenticated')
  if (user.role !== role) fail(403, `Access denied. ${role} role required.`)
  const table = { Owner: [db.owners, 'property_owner_id'], Tenant: [db.tenants, 'tenant_id'], Agent: [db.agents, 'agent_id'], Worker: [db.workers, 'worker_id'] }[role]
  if (!table) return { user }
  const row = table[0].find((r) => r.user_id === user.user_id)
  if (!row) fail(403, `No ${role.toLowerCase()} profile for this account.`)
  return { user, id: row[table[1]] }
}

const withProperty = (row) => {
  const p = property(row.property_id) || {}
  return { ...row, address: p.address, property_type: p.property_type, monthly_rent: row.monthly_rent ?? p.monthly_rent }
}

const routes = [
  // ---------- auth ----------
  ['POST', '/api/auth/login', ({ body }) => {
    const user = db.users.find((u) => u.username === String(body.username || '').trim().toLowerCase())
    if (!user || body.password !== DEMO_PASSWORD) fail(401, 'Invalid username or password')
    if (!user.is_active) fail(403, 'This account has been deactivated')
    window.sessionStorage.setItem(SESSION_KEY, String(user.user_id))
    return { user: publicUser(user) }
  }],
  ['POST', '/api/auth/logout', () => {
    window.sessionStorage.removeItem(SESSION_KEY)
    return { ok: true }
  }],
  ['GET', '/api/auth/session', () => {
    const user = sessionUser()
    if (!user) fail(401, 'Not authenticated')
    return { user: publicUser(user) }
  }],
  ['POST', '/api/auth/register', ({ body }) => {
    const username = String(body.username || '').trim().toLowerCase()
    if (!/^[a-z0-9_.]{3,30}$/.test(username)) fail(400, 'Username must be 3 to 30 letters, numbers, dots or underscores')
    if (String(body.password || '').length < 8) fail(400, 'Password must be at least 8 characters')
    if (!['Owner', 'Tenant'].includes(body.role)) fail(400, 'Choose Owner or Tenant')
    if (db.users.some((u) => u.username === username)) fail(409, 'That username is taken')
    const user = { user_id: nextId(), username, role: body.role, is_verified: true, is_active: true, created_at: new Date().toISOString() }
    db.users.push(user)
    const name = String(body.fullName || username).trim()
    if (body.role === 'Tenant') db.tenants.push({ tenant_id: nextId(), user_id: user.user_id, full_name: name, phone: body.phone || '', email: body.email || '' })
    else db.owners.push({ property_owner_id: nextId(), user_id: user.user_id, company_name: name, phone: body.phone || '', email: body.email || '' })
    window.sessionStorage.setItem(SESSION_KEY, String(user.user_id))
    return { user: publicUser(user) }
  }],

  // ---------- public ----------
  ['GET', '/api/public/properties', ({ query }) => {
    const q = (query.get('search') || '').toLowerCase()
    return {
      data: db.properties
        .filter((p) => p.status === 'Available')
        .filter((p) => !q || p.address.toLowerCase().includes(q) || p.property_type.toLowerCase().includes(q))
        .sort(desc('create_date')),
    }
  }],
  ['POST', '/api/public/enquiries', ({ body }) => {
    if (!property(body.propertyId)) fail(400, 'Invalid property id')
    if (!String(body.name || '').trim()) fail(400, 'Enter your name')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email || ''))) fail(400, 'Enter a valid email address')
    if (String(body.message || '').trim().length < 5) fail(400, 'Write a short message (5 to 2000 characters)')
    const enquiry = { enquiry_id: nextId(), property_id: Number(body.propertyId), enquirer_name: body.name.trim(), enquirer_email: body.email.trim(), message: body.message.trim(), status: 'New', created_at: new Date().toISOString() }
    db.enquiries.push(enquiry)
    return { data: { enquiry_id: enquiry.enquiry_id, status: 'New' } }
  }],

  // ---------- settings ----------
  ['GET', '/api/settings', () => {
    const user = sessionUser()
    if (!user) fail(401, 'Not authenticated')
    return { data: { username: user.username, role: user.role, profile: profileFor(user) } }
  }],
  ['PATCH', '/api/settings/profile', ({ body }) => {
    const user = sessionUser()
    if (!user) fail(401, 'Not authenticated')
    const map = { Owner: db.owners, Tenant: db.tenants, Agent: db.agents, Worker: db.workers }
    const row = (map[user.role] || []).find((r) => r.user_id === user.user_id)
    if (row) {
      if (body.fullName) row[user.role === 'Owner' ? 'company_name' : 'full_name'] = String(body.fullName).trim()
      if (body.phone !== undefined) row.phone = String(body.phone).trim()
      if (body.email !== undefined && user.role !== 'Worker') row.email = String(body.email).trim()
    }
    return { data: { username: user.username, role: user.role, profile: profileFor(user) } }
  }],
  ['POST', '/api/settings/password', ({ body }) => {
    if (body.currentPassword !== DEMO_PASSWORD) fail(400, 'Current password is incorrect')
    if (String(body.newPassword || '').length < 8) fail(400, 'New password must be at least 8 characters')
    return { ok: true }
  }],

  // ---------- owner ----------
  ['GET', '/api/dashboard/summary', () => {
    const { id } = requireRole('Owner')
    const props = db.properties.filter((p) => p.property_owner_id === id && p.status !== 'Removed')
    const ids = new Set(props.map((p) => p.property_id))
    const leases = db.leases.filter((l) => ids.has(l.property_id))
    const leaseIds = new Set(leases.map((l) => l.lease_id))
    const payments = db.payments.filter((p) => leaseIds.has(p.lease_id))
    return {
      totalProperties: props.length,
      monthlyIncome: payments.filter((p) => p.status === 'Complete' && new Date(p.payment_date) >= startOfMonth()).reduce((s, p) => s + p.amount, 0),
      activeTenants: new Set(leases.filter((l) => l.status === 'Active').map((l) => l.tenant_id)).size,
      openApplications: db.applications.filter((a) => ids.has(a.property_id) && a.status === 'Pending').length,
      incomeSeries: monthSeries(payments),
    }
  }],
  ['GET', '/api/properties', () => {
    const { id } = requireRole('Owner')
    return { data: db.properties.filter((p) => p.property_owner_id === id && p.status !== 'Removed').sort(desc('create_date')) }
  }],
  ['POST', '/api/properties', ({ body }) => {
    const { id } = requireRole('Owner')
    const rent = Number(body.monthlyRent)
    if (!String(body.address || '').trim()) fail(400, 'Address is required')
    if (!Number.isFinite(rent) || rent <= 0) fail(400, 'Enter a valid monthly rent')
    const row = {
      property_id: nextId(), property_owner_id: id, address: body.address.trim(), property_type: body.propertyType || 'Apartment',
      bedrooms: Number(body.bedrooms) || 1, bathrooms: Number(body.bathrooms) || 1, monthly_rent: rent, status: 'Available', create_date: new Date().toISOString(),
    }
    db.properties.push(row)
    return { data: row }
  }],
  ['DELETE', /^\/api\/properties\/(\d+)$/, ({ params }) => {
    const { id } = requireRole('Owner')
    const p = property(params[0])
    if (!p || p.property_owner_id !== id) fail(404, 'Property not found')
    if (p.status === 'Rented') fail(400, 'A rented property cannot be removed')
    p.status = 'Removed'
    return { data: { property_id: p.property_id, status: 'Removed' } }
  }],
  ['GET', '/api/applications', () => {
    const { id } = requireRole('Owner')
    const ids = new Set(db.properties.filter((p) => p.property_owner_id === id).map((p) => p.property_id))
    return {
      data: db.applications.filter((a) => ids.has(a.property_id)).sort(desc('application_date')).map((a) => ({ ...withProperty(a), tenant_name: tenant(a.tenant_id)?.full_name })),
    }
  }],
  ['PATCH', /^\/api\/applications\/(\d+)$/, ({ params, body }) => {
    const { id } = requireRole('Owner')
    const app = byId(db.applications, 'rental_application_id', params[0])
    if (!app || property(app.property_id)?.property_owner_id !== id) fail(404, 'Application not found')
    if (app.status !== 'Pending') fail(400, 'Only pending applications can be decided')
    if (!['Approved', 'Rejected'].includes(body.status)) fail(400, 'Invalid status')
    app.status = body.status
    return { data: { ...withProperty(app), tenant_name: tenant(app.tenant_id)?.full_name } }
  }],
  ['GET', '/api/tenants', () => {
    const { id } = requireRole('Owner')
    return {
      data: db.leases
        .filter((l) => l.status === 'Active' && property(l.property_id)?.property_owner_id === id)
        .map((l) => ({ ...tenant(l.tenant_id), lease_id: l.lease_id, start_date: l.start_date, end_date: l.end_date, monthly_rent: l.monthly_rent, lease_status: l.status, property_id: l.property_id, address: property(l.property_id).address })),
    }
  }],
  ['GET', '/api/payments', () => {
    const { id } = requireRole('Owner')
    const leaseIds = new Set(db.leases.filter((l) => property(l.property_id)?.property_owner_id === id).map((l) => l.lease_id))
    return {
      data: db.payments
        .filter((p) => leaseIds.has(p.lease_id))
        .sort(desc('payment_date'))
        .map((p) => {
          const lease = byId(db.leases, 'lease_id', p.lease_id)
          return { ...p, property_id: lease.property_id, address: property(lease.property_id).address, tenant_name: tenant(p.tenant_id)?.full_name }
        }),
    }
  }],

  // ---------- tenant ----------
  ['GET', '/api/tenant/summary', () => {
    const { id } = requireRole('Tenant')
    const lease = db.leases.filter((l) => l.tenant_id === id && l.status === 'Active').sort(desc('start_date'))[0]
    return {
      pendingApplications: db.applications.filter((a) => a.tenant_id === id && a.status === 'Pending').length,
      activeLease: lease ? { lease_id: lease.lease_id, monthly_rent: lease.monthly_rent, end_date: lease.end_date, address: property(lease.property_id).address } : null,
      totalPaid: db.payments.filter((p) => p.tenant_id === id && p.status === 'Complete').reduce((s, p) => s + p.amount, 0),
      openRequests: db.maintenance.filter((m) => m.tenant_id === id && m.status !== 'Complete').length,
    }
  }],
  ['GET', '/api/tenant/applications', () => {
    const { id } = requireRole('Tenant')
    return { data: db.applications.filter((a) => a.tenant_id === id).sort(desc('application_date')).map(withProperty) }
  }],
  ['POST', '/api/tenant/applications', ({ body }) => {
    const { id } = requireRole('Tenant')
    const p = property(body.propertyId)
    if (!p || p.status !== 'Available') fail(404, 'That property is not available')
    if (db.applications.some((a) => a.tenant_id === id && a.property_id === p.property_id && ['Pending', 'Approved'].includes(a.status))) fail(409, 'You have already applied for this property')
    const row = { rental_application_id: nextId(), tenant_id: id, property_id: p.property_id, application_date: new Date().toISOString(), status: 'Pending' }
    db.applications.push(row)
    return { data: { rental_application_id: row.rental_application_id, status: 'Pending' } }
  }],
  ['GET', '/api/tenant/leases', () => {
    const { id } = requireRole('Tenant')
    return { data: db.leases.filter((l) => l.tenant_id === id).map(withProperty) }
  }],
  ['GET', '/api/tenant/payments', () => {
    const { id } = requireRole('Tenant')
    return {
      data: db.payments.filter((p) => p.tenant_id === id).sort(desc('payment_date')).map((p) => ({ ...p, address: property(byId(db.leases, 'lease_id', p.lease_id).property_id).address })),
    }
  }],
  ['POST', '/api/tenant/payments', ({ body }) => {
    const { id } = requireRole('Tenant')
    const amount = Number(body.amount)
    const lease = db.leases.find((l) => l.lease_id === Number(body.leaseId) && l.tenant_id === id && l.status === 'Active')
    if (!lease) fail(404, 'No active lease found')
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) fail(400, 'Enter a valid amount')
    if (!['M-Pesa', 'Card', 'Bank Transfer', 'Cash'].includes(body.method)) fail(400, 'Choose a payment method')
    const row = { payment_id: nextId(), lease_id: lease.lease_id, tenant_id: id, amount, payment_method: body.method, status: 'Pending', confirmation_status: 'Awaiting', gateway_confirmation_id: null, payment_date: new Date().toISOString() }
    db.payments.push(row)
    return { data: row }
  }],
  ['GET', '/api/tenant/maintenance', () => {
    const { id } = requireRole('Tenant')
    return {
      data: db.maintenance.filter((m) => m.tenant_id === id).sort(desc('created_at')).map((m) => ({ ...withProperty(m), worker_name: worker(m.assigned_to)?.full_name || null })),
    }
  }],
  ['POST', '/api/tenant/maintenance', ({ body }) => {
    const { id } = requireRole('Tenant')
    const description = String(body.description || '').trim()
    if (description.length < 5 || description.length > 500) fail(400, 'Describe the issue in 5 to 500 characters')
    const lease = db.leases.find((l) => l.tenant_id === id && l.status === 'Active')
    if (!lease) fail(400, 'You need an active lease to report an issue')
    const row = { request_id: nextId(), property_id: lease.property_id, tenant_id: id, description, status: 'Open', assigned_to: null, created_at: new Date().toISOString(), completed_at: null }
    db.maintenance.push(row)
    return { data: { request_id: row.request_id, status: 'Open' } }
  }],
  ['GET', '/api/tenant/viewings', () => {
    const { id } = requireRole('Tenant')
    return { data: db.viewings.filter((v) => v.tenant_id === id).sort(desc('viewing_datetime')).map(withProperty) }
  }],
  ['POST', '/api/tenant/viewings', ({ body }) => {
    const { id } = requireRole('Tenant')
    const when = new Date(body.datetime)
    if (!property(body.propertyId)) fail(400, 'Invalid property id')
    if (Number.isNaN(when.getTime()) || when < new Date()) fail(400, 'Pick a future date and time')
    const row = { property_viewing_id: nextId(), tenant_id: id, property_id: Number(body.propertyId), viewing_datetime: when.toISOString(), status: 'Scheduled' }
    db.viewings.push(row)
    return { data: { property_viewing_id: row.property_viewing_id, status: 'Scheduled' } }
  }],

  // ---------- agent ----------
  ['GET', '/api/agent/summary', () => {
    const { id } = requireRole('Agent')
    const ids = agentProperties(id)
    return {
      activeListings: db.listings.filter((l) => l.agent_id === id && l.listing_status !== 'Archived').length,
      pendingApplications: db.applications.filter((a) => ids.has(a.property_id) && a.status === 'Pending').length,
      upcomingViewings: db.viewings.filter((v) => ids.has(v.property_id) && v.status === 'Scheduled' && new Date(v.viewing_datetime) >= new Date()).length,
      newEnquiries: db.enquiries.filter((e) => ids.has(e.property_id) && e.status === 'New').length,
    }
  }],
  ['GET', '/api/agent/listings', () => {
    const { id } = requireRole('Agent')
    return { data: db.listings.filter((l) => l.agent_id === id).sort(desc('listed_date')).map((l) => ({ ...property(l.property_id), ...l })) }
  }],
  ['GET', '/api/agent/applications', () => {
    const { id } = requireRole('Agent')
    const ids = agentProperties(id)
    return {
      data: db.applications.filter((a) => ids.has(a.property_id)).sort(desc('application_date')).map((a) => ({ ...withProperty(a), tenant_name: tenant(a.tenant_id)?.full_name, phone: tenant(a.tenant_id)?.phone })),
    }
  }],
  ['PATCH', /^\/api\/agent\/applications\/(\d+)$/, ({ params, body }) => {
    const { id } = requireRole('Agent')
    const app = byId(db.applications, 'rental_application_id', params[0])
    if (!['Approved', 'Rejected'].includes(body.status)) fail(400, 'Status must be Approved or Rejected')
    if (!app || app.status !== 'Pending' || !agentProperties(id).has(app.property_id)) fail(404, 'Pending application not found for your listings')
    app.status = body.status
    return { data: { rental_application_id: app.rental_application_id, status: app.status } }
  }],
  ['GET', '/api/agent/viewings', () => {
    const { id } = requireRole('Agent')
    const ids = agentProperties(id)
    return {
      data: db.viewings
        .filter((v) => ids.has(v.property_id))
        .sort((a, b) => new Date(a.viewing_datetime) - new Date(b.viewing_datetime))
        .map((v) => ({ ...withProperty(v), tenant_name: tenant(v.tenant_id)?.full_name, phone: tenant(v.tenant_id)?.phone })),
    }
  }],
  ['PATCH', /^\/api\/agent\/viewings\/(\d+)$/, ({ params, body }) => {
    const { id } = requireRole('Agent')
    const v = byId(db.viewings, 'property_viewing_id', params[0])
    if (!['Completed', 'Cancelled'].includes(body.status)) fail(400, 'Status must be Completed or Cancelled')
    if (!v || v.status !== 'Scheduled' || !agentProperties(id).has(v.property_id)) fail(404, 'Scheduled viewing not found for your listings')
    v.status = body.status
    return { data: { property_viewing_id: v.property_viewing_id, status: v.status } }
  }],
  ['GET', '/api/agent/enquiries', () => {
    const { id } = requireRole('Agent')
    const ids = agentProperties(id)
    return { data: db.enquiries.filter((e) => ids.has(e.property_id)).sort(desc('created_at')).map(withProperty) }
  }],
  ['PATCH', /^\/api\/agent\/enquiries\/(\d+)$/, ({ params, body }) => {
    const { id } = requireRole('Agent')
    const e = byId(db.enquiries, 'enquiry_id', params[0])
    if (!['Responded', 'Closed'].includes(body.status)) fail(400, 'Status must be Responded or Closed')
    const allowed = body.status === 'Responded' ? ['New'] : ['New', 'Responded']
    if (!e || !allowed.includes(e.status) || !agentProperties(id).has(e.property_id)) fail(400, 'Invalid enquiry status change')
    e.status = body.status
    return { data: { enquiry_id: e.enquiry_id, status: e.status } }
  }],

  // ---------- worker ----------
  ['GET', '/api/worker/summary', () => {
    const { id } = requireRole('Worker')
    const mine = db.maintenance.filter((m) => m.assigned_to === id)
    return {
      assigned: mine.filter((m) => m.status === 'Assigned').length,
      inProgress: mine.filter((m) => m.status === 'In Progress').length,
      completedThisMonth: mine.filter((m) => m.status === 'Complete' && new Date(m.completed_at) >= startOfMonth()).length,
      openPool: db.maintenance.filter((m) => m.status === 'Open' && !m.assigned_to).length,
    }
  }],
  ['GET', '/api/worker/jobs', () => {
    const { id } = requireRole('Worker')
    const order = { 'In Progress': 0, Assigned: 1, Complete: 2 }
    return { data: db.maintenance.filter((m) => m.assigned_to === id).sort((a, b) => order[a.status] - order[b.status]).map(jobRow) }
  }],
  ['GET', '/api/worker/open', () => {
    requireRole('Worker')
    return { data: db.maintenance.filter((m) => m.status === 'Open' && !m.assigned_to).map(jobRow) }
  }],
  ['POST', /^\/api\/worker\/jobs\/(\d+)\/claim$/, ({ params }) => {
    const { id } = requireRole('Worker')
    const job = byId(db.maintenance, 'request_id', params[0])
    if (!job || job.status !== 'Open' || job.assigned_to) fail(409, 'This job has already been taken')
    job.assigned_to = id
    job.status = 'Assigned'
    return { data: { request_id: job.request_id, status: 'Assigned' } }
  }],
  ['PATCH', /^\/api\/worker\/jobs\/(\d+)$/, ({ params, body }) => {
    const { id } = requireRole('Worker')
    const job = byId(db.maintenance, 'request_id', params[0])
    if (!job || job.assigned_to !== id) fail(404, 'Job not found')
    if (body.status === 'In Progress' && job.status !== 'Assigned') fail(400, 'Only an assigned job can be started')
    if (body.status === 'Complete' && job.status !== 'In Progress') fail(400, 'Start the job before completing it')
    if (!['In Progress', 'Complete'].includes(body.status)) fail(400, 'Status must be In Progress or Complete')
    job.status = body.status
    if (body.status === 'Complete') job.completed_at = new Date().toISOString()
    return { data: { request_id: job.request_id, status: job.status } }
  }],

  // ---------- admin ----------
  ['GET', '/api/admin/summary', () => {
    requireRole('Admin')
    const active = db.users.filter((u) => u.is_active)
    const props = db.properties.filter((p) => p.status !== 'Removed')
    const usersByRole = {}
    for (const u of active) usersByRole[u.role] = (usersByRole[u.role] || 0) + 1
    return {
      usersByRole,
      totalProperties: props.length,
      occupancyRate: props.length ? Math.round((props.filter((p) => p.status === 'Rented').length / props.length) * 100) : 0,
      monthlyRevenue: db.payments.filter((p) => p.status === 'Complete' && new Date(p.payment_date) >= startOfMonth()).reduce((s, p) => s + p.amount, 0),
      unverifiedUsers: active.filter((u) => !u.is_verified).length,
      pendingPayments: db.payments.filter((p) => p.status === 'Pending').length,
      openMaintenance: db.maintenance.filter((m) => m.status !== 'Complete').length,
      revenueSeries: monthSeries(db.payments),
    }
  }],
  ['GET', '/api/admin/users', ({ query }) => {
    requireRole('Admin')
    const role = query.get('role')
    const search = (query.get('search') || '').toLowerCase()
    return {
      data: db.users
        .filter((u) => !role || u.role === role)
        .filter((u) => !search || u.username.includes(search))
        .sort(desc('created_at'))
        .map((u) => {
          const p = profileFor(u)
          return { ...u, display_name: p.fullName || null, email: p.email || null }
        }),
    }
  }],
  ['PATCH', /^\/api\/admin\/users\/(\d+)$/, ({ params, body }) => {
    const { user: me } = requireRole('Admin')
    const u = byId(db.users, 'user_id', params[0])
    if (!u) fail(404, 'User not found')
    if (u.user_id === me.user_id && body.action === 'deactivate') fail(400, 'You cannot deactivate your own account')
    if (body.action === 'verify') u.is_verified = true
    else if (body.action === 'deactivate') u.is_active = false
    else if (body.action === 'activate') u.is_active = true
    else fail(400, 'Unknown action')
    return { data: { user_id: u.user_id, action: body.action } }
  }],
  ['GET', '/api/admin/properties', () => {
    requireRole('Admin')
    return {
      data: db.properties.filter((p) => p.status !== 'Removed').sort(desc('create_date')).map((p) => ({ ...p, owner_name: byId(db.owners, 'property_owner_id', p.property_owner_id)?.company_name })),
    }
  }],
  ['GET', '/api/admin/payments', () => {
    requireRole('Admin')
    return {
      data: db.payments.sort(desc('payment_date')).map((p) => ({ ...p, tenant_name: tenant(p.tenant_id)?.full_name, address: property(byId(db.leases, 'lease_id', p.lease_id).property_id).address })),
    }
  }],
  ['PATCH', /^\/api\/admin\/payments\/(\d+)$/, ({ params, body }) => {
    requireRole('Admin')
    const p = byId(db.payments, 'payment_id', params[0])
    if (!p) fail(404, 'Payment not found')
    if (p.status !== 'Pending') fail(400, 'Only pending payments can be updated')
    if (body.action === 'confirm') {
      p.status = 'Complete'
      p.confirmation_status = 'Confirmed'
      p.gateway_confirmation_id = body.reference || `ADM-${Date.now()}`
    } else if (body.action === 'fail') {
      p.status = 'Failed'
      p.confirmation_status = 'Failed'
    } else fail(400, 'Unknown action')
    return { data: { payment_id: p.payment_id, action: body.action } }
  }],
  ['GET', '/api/admin/maintenance', () => {
    requireRole('Admin')
    const order = { Open: 0, Assigned: 1, 'In Progress': 2, Complete: 3 }
    return {
      data: [...db.maintenance].sort((a, b) => order[a.status] - order[b.status]).map((m) => ({ ...jobRow(m), assigned_to: m.assigned_to, worker_name: worker(m.assigned_to)?.full_name || null })),
    }
  }],
  ['GET', '/api/admin/workers', () => {
    requireRole('Admin')
    return { data: db.workers.map(({ worker_id, full_name, specialty }) => ({ worker_id, full_name, specialty })) }
  }],
  ['PATCH', /^\/api\/admin\/maintenance\/(\d+)$/, ({ params, body }) => {
    requireRole('Admin')
    const job = byId(db.maintenance, 'request_id', params[0])
    if (!worker(body.workerId)) fail(400, 'Invalid request or worker id')
    if (!job || !['Open', 'Assigned'].includes(job.status)) fail(400, 'Only open requests can be assigned')
    job.assigned_to = Number(body.workerId)
    job.status = 'Assigned'
    return { data: { request_id: job.request_id, status: 'Assigned' } }
  }],
]

function agentProperties(agentId) {
  return new Set(db.listings.filter((l) => l.agent_id === agentId).map((l) => l.property_id))
}

function jobRow(m) {
  const t = tenant(m.tenant_id)
  return { ...withProperty(m), tenant_name: t?.full_name, tenant_phone: t?.phone }
}

const delay = () => new Promise((r) => setTimeout(r, 220 + Math.random() * 260))

export async function mockFetch(path, options = {}) {
  await delay()
  const url = new URL(path, 'http://mock.local')
  const method = (options.method || 'GET').toUpperCase()
  const body = options.body ? JSON.parse(options.body) : {}

  for (const [m, pattern, handler] of routes) {
    if (m !== method) continue
    const match = typeof pattern === 'string' ? (pattern === url.pathname ? [] : null) : url.pathname.match(pattern)?.slice(1)
    if (!match) continue
    // Return a deep copy so the UI can never mutate the mock tables directly.
    return JSON.parse(JSON.stringify(handler({ params: match, query: url.searchParams, body })))
  }
  throw new ApiError(404, 'Endpoint not found')
}

export function resetMockData() {
  db = seedPayments(createSeed())
}
