// backend/scripts/seed-admin.js
// Creates the one and only Admin account. Safe to run more than once.
//   run from the backend folder:  node scripts/seed-admin.js
// Defaults to username "admin" / password "admin". To choose your own instead:
//   PowerShell:  $env:ADMIN_PASSWORD='something-strong'; node scripts/seed-admin.js
//   Git Bash:    ADMIN_PASSWORD='something-strong' node scripts/seed-admin.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const db = require('../db');

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin';

  const [admins] = await db.query("SELECT user_id FROM user_account WHERE role = 'Admin' LIMIT 1");
  if (admins[0]) {
    console.log('An admin account already exists. Nothing was changed.');
    return;
  }
  const [taken] = await db.query('SELECT user_id FROM user_account WHERE username = ?', [username]);
  if (taken[0]) {
    console.error(`The username "${username}" is already used by a non-admin account. Remove or rename that account, then run this again.`);
    process.exitCode = 1;
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  await db.query(
    "INSERT INTO user_account (username, password_hash, role, is_verified, is_active) VALUES (?, ?, 'Admin', TRUE, TRUE)",
    [username, hash]
  );
  console.log(`Admin account "${username}" created.`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());