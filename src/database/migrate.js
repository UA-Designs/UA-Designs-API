const { sequelize } = require('../models');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Sync all models with database
    await sequelize.sync({ force: true });
    
    console.log('✅ Database migration completed successfully!');
    console.log('📊 Tables created:');
    console.log('   - users');
    console.log('   - projects');
    console.log('   - tasks');
    console.log('   - resources');
    console.log('   - costs');
    console.log('   - risks');
    console.log('   - quality');
    console.log('   - communications');
    console.log('   - procurement');
    console.log('   - stakeholders');
    console.log('   - materials');
    console.log('   - equipment');
    console.log('   - labor');
    console.log('   - schedules');
    console.log('   - budgets');
    console.log('   - reports');
    console.log('   - change_requests');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate(); 