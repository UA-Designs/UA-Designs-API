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
      await Task.create({
        name: 'Foundation Work',
        description: 'Excavation and foundation construction',
        projectId: project1.id,
        status: 'COMPLETED',
        priority: 'HIGH',
        plannedStartDate: new Date('2024-01-20'),
        plannedEndDate: new Date('2024-02-15'),
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
      await Task.create({
        name: 'Framing Work',
        description: 'Structural framing and roof installation',
        projectId: project1.id,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        plannedStartDate: new Date('2024-02-16'),
        plannedEndDate: new Date('2024-04-15'),
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
      await Task.create({
        name: 'Site Preparation',
        description: 'Site clearing and preparation for construction',
        projectId: project2.id,
        status: 'NOT_STARTED',
        priority: 'MEDIUM',
        plannedStartDate: new Date('2024-03-15'),
        plannedEndDate: new Date('2024-04-15'),
        duration: 31,
        plannedCost: 80000,
        progress: 0,
        assignedTo: adminUser.id
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