const bcrypt = require('bcryptjs');
const { User, Project, Task } = require('../models');

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
    let project1 = await Project.findOne({ where: { projectNumber: 'UA-2024001' } });
    if (!project1) {
      project1 = await Project.create({
        projectNumber: 'UA-2024001',
        name: 'Residential Complex A',
        description: 'Modern residential complex with 50 units',
        projectType: 'RESIDENTIAL',
        status: 'IN_PROGRESS',
        phase: 'EXECUTION',
        startDate: new Date('2024-01-15'),
        plannedEndDate: new Date('2024-08-30'),
        budget: 2500000,
        actualCost: 1800000,
        projectManagerId: adminUser.id,
        clientName: 'ABC Development Corp',
        projectLocation: {
          address: '123 Downtown Street',
          city: 'Metro City',
          coordinates: { lat: 14.5995, lng: 120.9842 },
          siteArea: '5000 sqm'
        },
        buildingPermits: 'BP-2024-001',
        siteConditions: 'Good soil conditions',
        safetyRequirements: 'OSHA compliant'
      });
      console.log('🏗️  Created project: Residential Complex A');
    } else {
      console.log('🏗️  Project already exists: Residential Complex A');
    }
    
    let project2 = await Project.findOne({ where: { projectNumber: 'UA-2024002' } });
    if (!project2) {
      project2 = await Project.create({
        projectNumber: 'UA-2024002',
        name: 'Commercial Building B',
        description: 'Office building with retail space',
        projectType: 'COMMERCIAL',
        status: 'PLANNING',
        phase: 'PLANNING',
        startDate: new Date('2024-03-01'),
        plannedEndDate: new Date('2024-12-15'),
        budget: 3500000,
        actualCost: 500000,
        projectManagerId: adminUser.id,
        clientName: 'XYZ Corporation',
        projectLocation: {
          address: '456 Business Avenue',
          city: 'Metro City',
          coordinates: { lat: 14.5995, lng: 120.9842 },
          siteArea: '3000 sqm'
        },
        buildingPermits: 'BP-2024-002',
        siteConditions: 'Urban development',
        safetyRequirements: 'Enhanced security measures'
      });
      console.log('🏗️  Created project: Commercial Building B');
    } else {
      console.log('🏗️  Project already exists: Commercial Building B');
    }
    
    // Create sample tasks (check if exist first)
    let task1 = await Task.findOne({ where: { taskNumber: 'TASK-001' } });
    if (!task1) {
      await Task.create({
        taskNumber: 'TASK-001',
        name: 'Foundation Work',
        description: 'Excavation and foundation construction',
        wbsCode: '1.1.1',
        projectId: project1.id,
        status: 'COMPLETED',
        priority: 'HIGH',
        plannedStartDate: new Date('2024-01-20'),
        plannedEndDate: new Date('2024-02-15'),
        actualStartDate: new Date('2024-01-20'),
        actualEndDate: new Date('2024-02-10'),
        plannedDuration: 26,
        plannedCost: 150000,
        actualCost: 140000,
        progress: 100,
        assignedToId: adminUser.id,
        createdById: adminUser.id,
        taskType: 'STRUCTURAL',
        location: 'Site A',
        isCritical: true
      });
      console.log('📋 Created task: Foundation Work');
    } else {
      console.log('📋 Task already exists: Foundation Work');
    }
    
    let task2 = await Task.findOne({ where: { taskNumber: 'TASK-002' } });
    if (!task2) {
      await Task.create({
        taskNumber: 'TASK-002',
        name: 'Framing Work',
        description: 'Structural framing and roof installation',
        wbsCode: '1.1.2',
        projectId: project1.id,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        plannedStartDate: new Date('2024-02-16'),
        plannedEndDate: new Date('2024-04-15'),
        actualStartDate: new Date('2024-02-12'),
        plannedDuration: 59,
        plannedCost: 300000,
        actualCost: 180000,
        progress: 60,
        assignedToId: adminUser.id,
        createdById: adminUser.id,
        taskType: 'STRUCTURAL',
        location: 'Site A',
        isCritical: true
      });
      console.log('📋 Created task: Framing Work');
    } else {
      console.log('📋 Task already exists: Framing Work');
    }
    
    let task3 = await Task.findOne({ where: { taskNumber: 'TASK-003' } });
    if (!task3) {
      await Task.create({
        taskNumber: 'TASK-003',
        name: 'Site Preparation',
        description: 'Site clearing and preparation for construction',
        wbsCode: '2.1.1',
        projectId: project2.id,
        status: 'NOT_STARTED',
        priority: 'MEDIUM',
        plannedStartDate: new Date('2024-03-15'),
        plannedEndDate: new Date('2024-04-15'),
        plannedDuration: 31,
        plannedCost: 80000,
        progress: 0,
        assignedToId: adminUser.id,
        createdById: adminUser.id,
        taskType: 'SITE_WORK',
        location: 'Site B',
        isCritical: false
      });
      console.log('📋 Created task: Site Preparation');
    } else {
      console.log('📋 Task already exists: Site Preparation');
    }
    
    console.log('✅ Database seeding completed successfully!');
    console.log('👤 Created admin user: admin@uadesigns.com / admin123');
    console.log('🏗️  Created 2 sample projects');
    console.log('📋 Created 3 sample tasks');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed(); 