require('dotenv').config();
const db = require('./db');

const NEEDED = {
  user_account: ['user_id', 'username', 'password_hash', 'role', 'is_verified', 'is_active'],
  property_owner: ['property_owner_id', 'user_id'],
  property: ['property_id', 'property_owner_id', 'address', 'property_type', 'bedrooms', 'bathrooms', 'monthly_rent', 'status', 'create_date'],
  tenant: ['tenant_id', 'user_id', 'full_name', 'phone', 'email'],
  rental_application: ['rental_application_id', 'tenant_id', 'property_id', 'application_date', 'status'],
  lease_agreement: ['lease_id', 'rental_application_id', 'tenant_id', 'property_id', 'start_date', 'end_date', 'monthly_rent', 'status'],
  payment: ['payment_id', 'lease_id', 'tenant_id', 'amount', 'payment_method', 'status', 'payment_date'],
};

(async () => {
  let problems = 0;
  try {
    const [cols] = await db.query(
      'SELECT table_name AS tbl, column_name AS col FROM information_schema.columns WHERE table_schema = ?',
      [process.env.DB_NAME]
    );
    const have = {};
    for (const { tbl, col } of cols) {
      const key = tbl.toLowerCase();
      if (!have[key]) have[key] = new Set();
      have[key].add(col.toLowerCase());
    }

    for (const [table, columns] of Object.entries(NEEDED)) {
      if (!have[table]) {
        console.log(`MISSING TABLE: ${table}`);
        problems++;
        continue;
      }
      const missing = columns.filter((c) => !have[table].has(c));
      if (missing.length) {
        console.log(`TABLE ${table} is missing columns: ${missing.join(', ')}`);
        problems++;
      } else {
        console.log(`ok: ${table}`);
      }
    }

    for (const table of ['property', 'tenant', 'rental_application', 'lease_agreement', 'payment']) {
      if (have[table]) {
        const [[r]] = await db.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
        console.log(`rows in ${table}: ${r.n}`);
      }
    }
    console.log(problems ? `\n${problems} problem(s) found` : '\nAll tables and columns found');
  } catch (err) {
    console.log('Check failed:', err.message);
  } finally {
    await db.end();
  }
})();