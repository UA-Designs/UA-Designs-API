'use strict';

/**
 * Clean seed — creates only a single admin account.
 * Use this for a fresh start without demo data.
 *
 *   npm run seed:clean
 */

const bcrypt = require('bcryptjs');

async function seedClean() {
  const { sequelize, User } = require('../models');

  console.log('Starting clean database seed...');
  await sequelize.sync({ force: true });

  const hashedPassword = await bcrypt.hash('admin123', 10);

  await User.create({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@uadesigns.com',
    password: hashedPassword,
    role: 'ADMIN',
    isActive: true,
  });

  console.log('');
  console.log('Clean database ready.');
  console.log('');
  console.log('─── Admin Account ────────────────────────────────');
  console.log('  Email:    admin@uadesigns.com');
  console.log('  Password: admin123');
  console.log('─────────────────────────────────────────────────');
  console.log('');
  console.log('Register additional users via POST /api/auth/register');
}

if (require.main === module) {
  seedClean()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Clean seed failed:', err.message);
      process.exit(1);
    });
}

module.exports = seedClean;
