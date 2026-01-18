const { sequelize } = require('../models');

async function migrate() {
  try {
    // Check for --force flag to drop and recreate tables
    const forceMode = process.argv.includes('--force');
    
    if (forceMode) {
      console.log('⚠️  WARNING: Running migration in FORCE mode - all data will be deleted!');
      console.log('🔄 Starting database migration with force: true...');
    } else {
      console.log('🔄 Starting database migration (alter mode - preserving data)...');
    }
    
    // Sync all models with database
    // force: true drops and recreates tables (data loss!)
    // alter: true modifies tables to match models (preserves data)
    await sequelize.sync({ force: forceMode, alter: !forceMode });
    
    console.log('✅ Database migration completed successfully!');
    console.log('📊 Tables synced:');
    console.log('   - users');
    console.log('   - projects');
    console.log('   - tasks');
    console.log('   - task_dependencies');
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
    
    if (!forceMode) {
      console.log('\n💡 Tip: Use --force flag to drop and recreate all tables (npm run migrate -- --force)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate(); 