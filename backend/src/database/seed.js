const bcrypt = require('bcryptjs');
const { User, Project, Task } = require('../models');

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@uadesigns.com',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      employeeId: 'UA-ADMIN-001'
    });
    
    // Create sample projects
    const project1 = await Project.create({
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
      location: 'Downtown Area',
      buildingPermits: 'BP-2024-001',
      siteConditions: 'Good soil conditions',
      safetyRequirements: 'OSHA compliant'
    });
    
    const project2 = await Project.create({
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
      location: 'Business District',
      buildingPermits: 'BP-2024-002',
      siteConditions: 'Urban development',
      safetyRequirements: 'Enhanced security measures'
    });
    
    // Create sample tasks
    await Task.create({
      taskNumber: 'TASK-001',
      name: 'Foundation Work',
      description: 'Excavation and foundation construction',
      projectId: project1.id,
      status: 'COMPLETED',
      priority: 'HIGH',
      plannedStartDate: new Date('2024-01-20'),
      plannedEndDate: new Date('2024-02-15'),
      actualStartDate: new Date('2024-01-20'),
      actualEndDate: new Date('2024-02-10'),
      plannedCost: 150000,
      actualCost: 140000,
      progress: 100,
      assignedToId: adminUser.id,
      taskType: 'STRUCTURAL',
      location: 'Site A',
      isCritical: true
    });
    
    await Task.create({
      taskNumber: 'TASK-002',
      name: 'Framing Work',
      description: 'Structural framing and roof installation',
      projectId: project1.id,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      plannedStartDate: new Date('2024-02-16'),
      plannedEndDate: new Date('2024-04-15'),
      actualStartDate: new Date('2024-02-12'),
      plannedCost: 300000,
      actualCost: 180000,
      progress: 60,
      assignedToId: adminUser.id,
      taskType: 'STRUCTURAL',
      location: 'Site A',
      isCritical: true
    });
    
    await Task.create({
      taskNumber: 'TASK-003',
      name: 'Site Preparation',
      description: 'Site clearing and preparation for construction',
      projectId: project2.id,
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      plannedStartDate: new Date('2024-03-15'),
      plannedEndDate: new Date('2024-04-15'),
      plannedCost: 80000,
      progress: 0,
      assignedToId: adminUser.id,
      taskType: 'SITE_WORK',
      location: 'Site B',
      isCritical: false
    });
    
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