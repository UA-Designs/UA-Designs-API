const { sequelize } = require('../models');
const { ensureAiRiskSuggestionColumns } = require('./ensureAiRiskColumns');
const { ensureScheduleSuggestionColumns } = require('./ensureScheduleSuggestionColumns');
const { ensureAiConversationTables } = require('./ensureAiConversationTables');
const { ensureForecastTables } = require('./ensureForecastTables');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Sync all models with database
    await sequelize.sync({ force: true });
    await ensureAiRiskSuggestionColumns(sequelize);
    await ensureScheduleSuggestionColumns(sequelize);
    await ensureAiConversationTables();
    await ensureForecastTables();
    
    console.log('✅ Database migration completed successfully!');
    console.log('📊 Tables created:');
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
    console.log('   - forecast_snapshots');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate(); 