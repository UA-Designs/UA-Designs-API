const bcrypt = require('bcryptjs');
const { User, Project, Task, TaskDependency } = require('../models');

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
    
    console.log('✅ Database seeding completed successfully!');
    console.log('👤 Created admin user: admin@uadesigns.com / admin123');
    console.log('🏗️  Created 2 sample projects');
    console.log('📋 Created 5 sample tasks');
    console.log('🔗 Created 3 sample task dependencies');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed(); 