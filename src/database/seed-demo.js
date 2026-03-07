'use strict';

/**
 * Development seed — delegates to the comprehensive test seed so that
 * npm run dev and npm run seed both use the same rich, fully-featured
 * dataset that integration tests rely on.
 */

const seedTestDatabase = require('../../tests/helpers/seedTestDatabase');

async function seed() {
  console.log('Starting comprehensive database seed...');
  await seedTestDatabase();
  console.log('Database seeded successfully');
  console.log('');
  console.log('─── Demo Login Accounts ──────────────────────────');
  console.log('  Admin:    admin@uadesigns.com    / password123');
  console.log('  Manager:  manager@uadesigns.com  / password123  (Project Manager tier)');
  console.log('  Engineer: engineer@uadesigns.com / password123  (Engineer tier)');
  console.log('  Staff:    staff@uadesigns.com    / password123  (Staff tier — read-only)');
  console.log('─────────────────────────────────────────────────');
}

// When run directly via npm run seed, sync first then seed
if (require.main === module) {
  const { sequelize } = require('../models');
  sequelize.sync({ force: true })
    .then(() => seed())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err.message);
      process.exit(1);
    });
}

module.exports = seed;
