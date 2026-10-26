// Demo dataset mirroring the MySQL schema (database/schema.sql). Used by the
// in-browser mock API until the real Express backend is connected.

const now = new Date()
const daysAgo = (n) => new Date(now.getTime() - n * 86400000).toISOString()
const daysAhead = (n) => new Date(now.getTime() + n * 86400000).toISOString()
const monthsAgo = (m, day = 3) => new Date(now.getFullYear(), now.getMonth() - m, day).toISOString()

export const DEMO_PASSWORD = 'password123'

export function createSeed() {
  return {
    users: [
      { user_id: 1, username: 'admin', role: 'Admin', is_verified: true, is_active: true, created_at: monthsAgo(14) },
      { user_id: 2, username: 'jkamau', role: 'Owner', is_verified: true, is_active: true, created_at: monthsAgo(12) },
      { user_id: 3, username: 'mwanjiru', role: 'Tenant', is_verified: true, is_active: true, created_at: monthsAgo(9) },
      { user_id: 4, username: 'bochieng', role: 'Tenant', is_verified: true, is_active: true, created_at: monthsAgo(7) },
      { user_id: 5, username: 'ankirui', role: 'Agent', is_verified: true, is_active: true, created_at: monthsAgo(11) },
      { user_id: 6, username: 'pmutua', role: 'Worker', is_verified: true, is_active: true, created_at: monthsAgo(10) },
      { user_id: 7, username: 'gwafula', role: 'Tenant', is_verified: false, is_active: true, created_at: daysAgo(4) },
      { user_id: 8, username: 'savannahomes', role: 'Owner', is_verified: true, is_active: true, created_at: monthsAgo(8) },
      { user_id: 9, username: 'jotieno', role: 'Worker', is_verified: false, is_active: true, created_at: daysAgo(2) },
      { user_id: 10, username: 'lchebet', role: 'Tenant', is_verified: true, is_active: false, created_at: monthsAgo(6) },
    ],
    owners: [
      { property_owner_id: 1, user_id: 2, company_name: 'Kamau Holdings', phone: '0712 345 678', email: 'j.kamau@example.co.ke' },
      { property_owner_id: 2, user_id: 8, company_name: 'Savanna Homes Ltd', phone: '0733 222 110', email: 'hello@savannahomes.co.ke' },
    ],
    tenants: [
      { tenant_id: 1, user_id: 3, full_name: 'Mary Wanjiru', phone: '0722 100 200', email: 'mary.wanjiru@example.co.ke' },
      { tenant_id: 2, user_id: 4, full_name: 'Brian Ochieng', phone: '0711 555 432', email: 'brian.o@example.co.ke' },
      { tenant_id: 3, user_id: 7, full_name: 'Grace Wafula', phone: '0700 909 808', email: 'grace.w@example.co.ke' },
      { tenant_id: 4, user_id: 10, full_name: 'Linet Chebet', phone: '0745 321 654', email: 'l.chebet@example.co.ke' },
    ],
    agents: [{ agent_id: 1, user_id: 5, full_name: 'Alice Nkirui', phone: '0720 888 777', email: 'alice@velora.co.ke' }],
    workers: [
      { worker_id: 1, user_id: 6, full_name: 'Peter Mutua', phone: '0724 456 123', specialty: 'Plumbing' },
      { worker_id: 2, user_id: 9, full_name: 'James Otieno', phone: '0790 123 456', specialty: 'Electrical' },
    ],
    properties: [
      { property_id: 1, property_owner_id: 1, address: '14 Riverside Drive, Westlands', property_type: 'Apartment', bedrooms: 2, bathrooms: 2, monthly_rent: 85000, status: 'Rented', create_date: monthsAgo(11) },
      { property_id: 2, property_owner_id: 1, address: '7 Ngong Road, Kilimani', property_type: 'Apartment', bedrooms: 3, bathrooms: 2, monthly_rent: 120000, status: 'Rented', create_date: monthsAgo(10) },
      { property_id: 3, property_owner_id: 1, address: '22 Karen Hardy Lane, Karen', property_type: 'House', bedrooms: 4, bathrooms: 3, monthly_rent: 250000, status: 'Available', create_date: monthsAgo(4) },
      { property_id: 4, property_owner_id: 1, address: '3 Lavington Green, Lavington', property_type: 'Townhouse', bedrooms: 3, bathrooms: 3, monthly_rent: 180000, status: 'Available', create_date: monthsAgo(2) },
      { property_id: 5, property_owner_id: 2, address: '88 Moi Avenue, CBD', property_type: 'Studio', bedrooms: 1, bathrooms: 1, monthly_rent: 35000, status: 'Rented', create_date: monthsAgo(8) },
      { property_id: 6, property_owner_id: 2, address: '41 Kileleshwa Close, Kileleshwa', property_type: 'Apartment', bedrooms: 2, bathrooms: 1, monthly_rent: 70000, status: 'Available', create_date: monthsAgo(1) },
      { property_id: 7, property_owner_id: 2, address: '9 Runda Grove, Runda', property_type: 'House', bedrooms: 5, bathrooms: 4, monthly_rent: 320000, status: 'Available', create_date: daysAgo(12) },
      { property_id: 8, property_owner_id: 1, address: '5 Parklands 3rd Ave, Parklands', property_type: 'Apartment', bedrooms: 1, bathrooms: 1, monthly_rent: 48000, status: 'Under Maintenance', create_date: monthsAgo(6) },
    ],
    listings: [
      { listing_id: 1, property_id: 3, agent_id: 1, listing_status: 'Active', listed_date: daysAgo(40), description: 'Leafy family home with a mature garden and staff quarters.' },
      { listing_id: 2, property_id: 4, agent_id: 1, listing_status: 'Active', listed_date: daysAgo(21), description: 'Modern townhouse in a gated community with a pool.' },
      { listing_id: 3, property_id: 6, agent_id: 1, listing_status: 'Active', listed_date: daysAgo(14), description: 'Bright two-bedroom close to Yaya Centre.' },
      { listing_id: 4, property_id: 7, agent_id: 1, listing_status: 'Active', listed_date: daysAgo(6), description: 'Executive villa on a half-acre with backup power.' },
      { listing_id: 5, property_id: 1, agent_id: 1, listing_status: 'Archived', listed_date: daysAgo(330), description: 'Riverside apartment with balcony views.' },
    ],
    applications: [
      { rental_application_id: 1, tenant_id: 3, property_id: 3, application_date: daysAgo(3), status: 'Pending' },
      { rental_application_id: 2, tenant_id: 1, property_id: 4, application_date: daysAgo(5), status: 'Pending' },
      { rental_application_id: 3, tenant_id: 2, property_id: 6, application_date: daysAgo(9), status: 'Approved' },
      { rental_application_id: 4, tenant_id: 4, property_id: 7, application_date: daysAgo(2), status: 'Pending' },
      { rental_application_id: 5, tenant_id: 3, property_id: 6, application_date: daysAgo(20), status: 'Rejected' },
    ],
    leases: [
      { lease_id: 1, tenant_id: 1, property_id: 1, start_date: monthsAgo(9, 1), end_date: monthsAgo(-3, 1), monthly_rent: 85000, status: 'Active', signed_date: monthsAgo(9, 1) },
      { lease_id: 2, tenant_id: 2, property_id: 2, start_date: monthsAgo(7, 1), end_date: monthsAgo(-5, 1), monthly_rent: 120000, status: 'Active', signed_date: monthsAgo(7, 1) },
      { lease_id: 3, tenant_id: 4, property_id: 5, start_date: monthsAgo(6, 1), end_date: monthsAgo(-6, 1), monthly_rent: 35000, status: 'Active', signed_date: monthsAgo(6, 1) },
    ],
    payments: [],
    maintenance: [
      { request_id: 1, property_id: 1, tenant_id: 1, description: 'Kitchen sink is leaking under the cabinet.', status: 'In Progress', assigned_to: 1, created_at: daysAgo(3), completed_at: null },
      { request_id: 2, property_id: 2, tenant_id: 2, description: 'Bedroom socket sparks when plugging in.', status: 'Open', assigned_to: null, created_at: daysAgo(1), completed_at: null },
      { request_id: 3, property_id: 5, tenant_id: 4, description: 'Shower water heater not working.', status: 'Assigned', assigned_to: 1, created_at: daysAgo(2), completed_at: null },
      { request_id: 4, property_id: 1, tenant_id: 1, description: 'Replace broken balcony door handle.', status: 'Complete', assigned_to: 1, created_at: daysAgo(18), completed_at: daysAgo(15) },
      { request_id: 5, property_id: 2, tenant_id: 2, description: 'Water pressure is very low in the mornings.', status: 'Open', assigned_to: null, created_at: daysAgo(0), completed_at: null },
    ],
    viewings: [
      { property_viewing_id: 1, tenant_id: 3, property_id: 3, viewing_datetime: daysAhead(2), status: 'Scheduled' },
      { property_viewing_id: 2, tenant_id: 1, property_id: 4, viewing_datetime: daysAhead(4), status: 'Scheduled' },
      { property_viewing_id: 3, tenant_id: 2, property_id: 6, viewing_datetime: daysAgo(10), status: 'Completed' },
      { property_viewing_id: 4, tenant_id: 4, property_id: 7, viewing_datetime: daysAhead(1), status: 'Scheduled' },
    ],
    enquiries: [
      { enquiry_id: 1, property_id: 7, enquirer_name: 'Daniel Kiprop', enquirer_email: 'd.kiprop@example.com', message: 'Is the villa available from next month? Do you accept pets?', status: 'New', created_at: daysAgo(1) },
      { enquiry_id: 2, property_id: 3, enquirer_name: 'Faith Achieng', enquirer_email: 'faith.a@example.com', message: 'Could I arrange a weekend viewing?', status: 'New', created_at: daysAgo(2) },
      { enquiry_id: 3, property_id: 6, enquirer_name: 'Samuel Mwangi', enquirer_email: 'sam.m@example.com', message: 'Is parking included in the rent?', status: 'Responded', created_at: daysAgo(6) },
    ],
    nextId: 100,
  }
}

// Six months of rent history for each active lease, plus a pending one.
export function seedPayments(db) {
  const methods = ['M-Pesa', 'Bank Transfer', 'M-Pesa', 'Card']
  let id = 1
  for (const lease of db.leases) {
    for (let m = 5; m >= 0; m--) {
      if (m === 0 && lease.lease_id === 3) continue
      db.payments.push({
        payment_id: id++,
        lease_id: lease.lease_id,
        tenant_id: lease.tenant_id,
        amount: lease.monthly_rent,
        payment_method: methods[(id + m) % methods.length],
        status: 'Complete',
        confirmation_status: 'Confirmed',
        gateway_confirmation_id: `QK${String(700000 + id * 37).slice(0, 6)}X`,
        payment_date: monthsAgo(m, 2 + lease.lease_id),
      })
    }
  }
  db.payments.push({
    payment_id: id++,
    lease_id: 3,
    tenant_id: 4,
    amount: 35000,
    payment_method: 'M-Pesa',
    status: 'Pending',
    confirmation_status: 'Awaiting',
    gateway_confirmation_id: null,
    payment_date: daysAgo(1),
  })
  return db
}
