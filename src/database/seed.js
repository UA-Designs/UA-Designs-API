const bcrypt = require('bcryptjs');
const { User, Project, Task, TaskDependency, Risk, RiskMitigation, RiskCategory } = require('../models');

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Create admin user (check if exists first)
    let adminUser = await User.findOne({ where: { email: 'admin@uadesigns.com' } });
    
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      adminUser = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@uadesigns.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        employeeId: 'UA-ADMIN-001'
      });
      console.log('👤 Created admin user: admin@uadesigns.com / admin123');
    } else {
      console.log('👤 Admin user already exists: admin@uadesigns.com / admin123');
    }
    
    // Create sample projects (check if exist first)
    let project1 = await Project.findOne({ where: { name: 'Residential Complex A' } });
    if (!project1) {
      project1 = await Project.create({
        name: 'Residential Complex A',
        description: 'Modern residential complex with 50 units',
        projectType: 'residential',
        status: 'active',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-08-30'),
        budget: 2500000,
        projectManagerId: adminUser.id,
        clientName: 'ABC Development Corp',
        clientEmail: 'contact@abcdev.com',
        clientPhone: '+1-555-0123',
        location: '123 Downtown Street, Metro City',
        priority: 'high',
        progress: 65
      });
      console.log('🏗️  Created project: Residential Complex A');
    } else {
      console.log('🏗️  Project already exists: Residential Complex A');
    }
    
    let project2 = await Project.findOne({ where: { name: 'Commercial Building B' } });
    if (!project2) {
      project2 = await Project.create({
        name: 'Commercial Building B',
        description: 'Office building with retail space',
        projectType: 'commercial',
        status: 'planning',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-12-15'),
        budget: 3500000,
        projectManagerId: adminUser.id,
        clientName: 'XYZ Corporation',
        clientEmail: 'info@xyzcorp.com',
        clientPhone: '+1-555-0456',
        location: '456 Business Avenue, Metro City',
        priority: 'medium',
        progress: 15
      });
      console.log('🏗️  Created project: Commercial Building B');
    } else {
      console.log('🏗️  Project already exists: Commercial Building B');
    }
    
    // Create sample tasks (check if exist first)
    let task1 = await Task.findOne({ where: { name: 'Foundation Work' } });
    if (!task1) {
      task1 = await Task.create({
        name: 'Foundation Work',
        description: 'Excavation and foundation construction',
        projectId: project1.id,
        status: 'COMPLETED',
        priority: 'HIGH',
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-02-15'),
        actualStartDate: new Date('2024-01-20'),
        actualEndDate: new Date('2024-02-10'),
        duration: 26,
        plannedCost: 150000,
        actualCost: 140000,
        progress: 100,
        assignedTo: adminUser.id
      });
      console.log('📋 Created task: Foundation Work');
    } else {
      console.log('📋 Task already exists: Foundation Work');
    }
    
    let task2 = await Task.findOne({ where: { name: 'Framing Work' } });
    if (!task2) {
      task2 = await Task.create({
        name: 'Framing Work',
        description: 'Structural framing and roof installation',
        projectId: project1.id,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        startDate: new Date('2024-02-16'),
        endDate: new Date('2024-04-15'),
        actualStartDate: new Date('2024-02-12'),
        duration: 59,
        plannedCost: 300000,
        actualCost: 180000,
        progress: 60,
        assignedTo: adminUser.id
      });
      console.log('📋 Created task: Framing Work');
    } else {
      console.log('📋 Task already exists: Framing Work');
    }
    
    let task3 = await Task.findOne({ where: { name: 'Site Preparation' } });
    if (!task3) {
      task3 = await Task.create({
        name: 'Site Preparation',
        description: 'Site clearing and preparation for construction',
        projectId: project2.id,
        status: 'NOT_STARTED',
        priority: 'MEDIUM',
        startDate: new Date('2024-03-15'),
        endDate: new Date('2024-04-15'),
        duration: 31,
        plannedCost: 80000,
        progress: 0,
        assignedTo: adminUser.id
      });
      console.log('📋 Created task: Site Preparation');
    } else {
      console.log('📋 Task already exists: Site Preparation');
    }

    // Create additional tasks for better dependency examples
    let task4 = await Task.findOne({ where: { name: 'Electrical Work' } });
    if (!task4) {
      task4 = await Task.create({
        name: 'Electrical Work',
        description: 'Electrical installation and wiring',
        projectId: project1.id,
        status: 'NOT_STARTED',
        priority: 'HIGH',
        startDate: new Date('2024-04-16'),
        endDate: new Date('2024-06-15'),
        duration: 60,
        plannedCost: 200000,
        progress: 0,
        assignedTo: adminUser.id
      });
      console.log('📋 Created task: Electrical Work');
    } else {
      console.log('📋 Task already exists: Electrical Work');
    }

    let task5 = await Task.findOne({ where: { name: 'Plumbing Work' } });
    if (!task5) {
      task5 = await Task.create({
        name: 'Plumbing Work',
        description: 'Plumbing installation and fixtures',
        projectId: project1.id,
        status: 'NOT_STARTED',
        priority: 'HIGH',
        startDate: new Date('2024-04-16'),
        endDate: new Date('2024-06-15'),
        duration: 60,
        plannedCost: 180000,
        progress: 0,
        assignedTo: adminUser.id
      });
      console.log('📋 Created task: Plumbing Work');
    } else {
      console.log('📋 Task already exists: Plumbing Work');
    }

    // Create sample task dependencies
    const existingDependency1 = await TaskDependency.findOne({
      where: {
        predecessorTaskId: task1.id,
        successorTaskId: task2.id
      }
    });

    if (!existingDependency1) {
      await TaskDependency.create({
        predecessorTaskId: task1.id,
        successorTaskId: task2.id,
        dependencyType: 'FINISH_TO_START',
        lag: 0,
        description: 'Foundation must be completed before framing can begin',
        isHardDependency: true,
        createdBy: adminUser.id
      });
      console.log('🔗 Created dependency: Foundation Work → Framing Work');
    } else {
      console.log('🔗 Dependency already exists: Foundation Work → Framing Work');
    }

    const existingDependency2 = await TaskDependency.findOne({
      where: {
        predecessorTaskId: task2.id,
        successorTaskId: task4.id
      }
    });

    if (!existingDependency2) {
      await TaskDependency.create({
        predecessorTaskId: task2.id,
        successorTaskId: task4.id,
        dependencyType: 'FINISH_TO_START',
        lag: 1,
        description: 'Framing must be completed before electrical work can begin',
        isHardDependency: true,
        createdBy: adminUser.id
      });
      console.log('🔗 Created dependency: Framing Work → Electrical Work');
    } else {
      console.log('🔗 Dependency already exists: Framing Work → Electrical Work');
    }

    const existingDependency3 = await TaskDependency.findOne({
      where: {
        predecessorTaskId: task2.id,
        successorTaskId: task5.id
      }
    });

    if (!existingDependency3) {
      await TaskDependency.create({
        predecessorTaskId: task2.id,
        successorTaskId: task5.id,
        dependencyType: 'FINISH_TO_START',
        lag: 1,
        description: 'Framing must be completed before plumbing work can begin',
        isHardDependency: true,
        createdBy: adminUser.id
      });
      console.log('🔗 Created dependency: Framing Work → Plumbing Work');
    } else {
      console.log('🔗 Dependency already exists: Framing Work → Plumbing Work');
    }

    // Create sample risk categories
    let safetyCategory = await RiskCategory.findOne({ where: { name: 'Safety' } });
    if (!safetyCategory) {
      safetyCategory = await RiskCategory.create({
        name: 'Safety',
        description: 'Risks related to worker and site safety',
        color: '#EF4444',
        icon: 'shield-exclamation',
        sortOrder: 1
      });
      console.log('📁 Created risk category: Safety');
    }

    let technicalCategory = await RiskCategory.findOne({ where: { name: 'Technical' } });
    if (!technicalCategory) {
      technicalCategory = await RiskCategory.create({
        name: 'Technical',
        description: 'Risks related to technical requirements and specifications',
        color: '#3B82F6',
        icon: 'cog',
        sortOrder: 2
      });
      console.log('📁 Created risk category: Technical');
    }

    let environmentalCategory = await RiskCategory.findOne({ where: { name: 'Environmental' } });
    if (!environmentalCategory) {
      environmentalCategory = await RiskCategory.create({
        name: 'Environmental',
        description: 'Risks related to weather and environmental conditions',
        color: '#10B981',
        icon: 'cloud',
        sortOrder: 3
      });
      console.log('📁 Created risk category: Environmental');
    }

    let financialCategory = await RiskCategory.findOne({ where: { name: 'Financial' } });
    if (!financialCategory) {
      financialCategory = await RiskCategory.create({
        name: 'Financial',
        description: 'Risks related to budget and cost overruns',
        color: '#F59E0B',
        icon: 'currency-dollar',
        sortOrder: 4
      });
      console.log('📁 Created risk category: Financial');
    }

    // Create sample risks
    let risk1 = await Risk.findOne({ where: { title: 'Adverse Weather Conditions' } });
    if (!risk1) {
      risk1 = await Risk.create({
        title: 'Adverse Weather Conditions',
        description: 'Severe weather may delay outdoor construction activities and impact project schedule',
        category: 'ENVIRONMENTAL',
        categoryId: environmentalCategory.id,
        probability: 0.6,
        impact: 0.7,
        status: 'IDENTIFIED',
        riskType: 'THREAT',
        projectId: project1.id,
        identifiedBy: adminUser.id,
        owner: adminUser.id,
        potentialCostImpact: 50000,
        potentialScheduleImpact: 14,
        triggers: 'Weather forecast showing storms, Temperature drops below freezing',
        mitigationStrategy: 'Monitor weather forecasts, Schedule weather-sensitive work during favorable periods',
        contingencyPlan: 'Have indoor work ready as backup, Acquire weather protection equipment'
      });
      console.log('⚠️  Created risk: Adverse Weather Conditions');
    }

    let risk2 = await Risk.findOne({ where: { title: 'Material Supply Delays' } });
    if (!risk2) {
      risk2 = await Risk.create({
        title: 'Material Supply Delays',
        description: 'Key construction materials may not arrive on schedule due to supply chain issues',
        category: 'EXTERNAL',
        probability: 0.5,
        impact: 0.8,
        status: 'ANALYZING',
        riskType: 'THREAT',
        projectId: project1.id,
        identifiedBy: adminUser.id,
        owner: adminUser.id,
        potentialCostImpact: 75000,
        potentialScheduleImpact: 21,
        triggers: 'Supplier communication issues, Global supply chain disruptions',
        mitigationStrategy: 'Maintain relationships with multiple suppliers, Order materials well in advance'
      });
      console.log('⚠️  Created risk: Material Supply Delays');
    }

    let risk3 = await Risk.findOne({ where: { title: 'Skilled Labor Shortage' } });
    if (!risk3) {
      risk3 = await Risk.create({
        title: 'Skilled Labor Shortage',
        description: 'Difficulty in finding qualified workers for specialized construction tasks',
        category: 'RESOURCE',
        probability: 0.4,
        impact: 0.6,
        status: 'PLANNED',
        riskType: 'THREAT',
        projectId: project1.id,
        identifiedBy: adminUser.id,
        owner: adminUser.id,
        potentialCostImpact: 40000,
        potentialScheduleImpact: 10
      });
      console.log('⚠️  Created risk: Skilled Labor Shortage');
    }

    let risk4 = await Risk.findOne({ where: { title: 'Safety Incident' } });
    if (!risk4) {
      risk4 = await Risk.create({
        title: 'Safety Incident',
        description: 'Potential for workplace accidents or injuries on the construction site',
        category: 'SAFETY',
        categoryId: safetyCategory.id,
        probability: 0.3,
        impact: 0.9,
        status: 'IN_PROGRESS',
        riskType: 'THREAT',
        projectId: project1.id,
        identifiedBy: adminUser.id,
        owner: adminUser.id,
        potentialCostImpact: 100000,
        potentialScheduleImpact: 30
      });
      console.log('⚠️  Created risk: Safety Incident');
    }

    // Create sample risk mitigations
    let mitigation1 = await RiskMitigation.findOne({ 
      where: { riskId: risk1.id, action: 'Implement weather monitoring system' } 
    });
    if (!mitigation1) {
      mitigation1 = await RiskMitigation.create({
        riskId: risk1.id,
        strategy: 'MITIGATE',
        action: 'Implement weather monitoring system',
        description: 'Set up automated weather alerts and integrate with project scheduling',
        responsible: adminUser.id,
        dueDate: new Date('2024-02-15'),
        status: 'COMPLETED',
        completedDate: new Date('2024-02-10'),
        estimatedCost: 2000,
        actualCost: 1800,
        effectiveness: 'EFFECTIVE',
        createdBy: adminUser.id
      });
      console.log('🛡️  Created mitigation: Weather monitoring system');
    }

    let mitigation2 = await RiskMitigation.findOne({ 
      where: { riskId: risk1.id, action: 'Procure weather protection equipment' } 
    });
    if (!mitigation2) {
      mitigation2 = await RiskMitigation.create({
        riskId: risk1.id,
        strategy: 'MITIGATE',
        action: 'Procure weather protection equipment',
        description: 'Purchase tarps, covers, and temporary shelters for protecting work in progress',
        responsible: adminUser.id,
        dueDate: new Date('2024-03-01'),
        status: 'IN_PROGRESS',
        estimatedCost: 15000,
        createdBy: adminUser.id
      });
      console.log('🛡️  Created mitigation: Weather protection equipment');
    }

    let mitigation3 = await RiskMitigation.findOne({ 
      where: { riskId: risk2.id, action: 'Establish secondary supplier agreements' } 
    });
    if (!mitigation3) {
      mitigation3 = await RiskMitigation.create({
        riskId: risk2.id,
        strategy: 'TRANSFER',
        action: 'Establish secondary supplier agreements',
        description: 'Negotiate contracts with backup suppliers for critical materials',
        responsible: adminUser.id,
        dueDate: new Date('2024-02-28'),
        status: 'PLANNED',
        estimatedCost: 5000,
        createdBy: adminUser.id
      });
      console.log('🛡️  Created mitigation: Secondary supplier agreements');
    }

    let mitigation4 = await RiskMitigation.findOne({ 
      where: { riskId: risk4.id, action: 'Conduct weekly safety training sessions' } 
    });
    if (!mitigation4) {
      mitigation4 = await RiskMitigation.create({
        riskId: risk4.id,
        strategy: 'MITIGATE',
        action: 'Conduct weekly safety training sessions',
        description: 'Regular safety briefings and training for all site workers',
        responsible: adminUser.id,
        dueDate: new Date('2024-12-31'),
        status: 'IN_PROGRESS',
        estimatedCost: 10000,
        createdBy: adminUser.id
      });
      console.log('🛡️  Created mitigation: Weekly safety training');
    }
    
    console.log('✅ Database seeding completed successfully!');
    console.log('👤 Created admin user: admin@uadesigns.com / admin123');
    console.log('🏗️  Created 2 sample projects');
    console.log('📋 Created 5 sample tasks');
    console.log('🔗 Created 3 sample task dependencies');
    console.log('📁 Created 4 risk categories');
    console.log('⚠️  Created 4 sample risks');
    console.log('🛡️  Created 4 sample risk mitigations');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed(); 