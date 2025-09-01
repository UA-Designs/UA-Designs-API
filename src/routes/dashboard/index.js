const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');

// Dashboard controller functions
const getStats = async (req, res) => {
  try {
    // Mock dashboard stats data
    const stats = {
      totalProjects: 12,
      activeProjects: 8,
      completedProjects: 4,
      totalTasks: 156,
      completedTasks: 89,
      overdueTasks: 7,
      totalBudget: 2500000,
      spentBudget: 1800000,
      remainingBudget: 700000,
      teamMembers: 24,
      activeUsers: 18,
      riskItems: 3,
      qualityIssues: 2,
      changeRequests: 5
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
};

const getProjectProgress = async (req, res) => {
  try {
    // Mock project progress data
    const projectProgress = [
      {
        id: 1,
        name: 'Office Building Construction',
        progress: 75,
        status: 'In Progress',
        startDate: '2024-01-15',
        endDate: '2024-06-30',
        budget: 500000,
        spent: 375000,
        phase: 'Construction'
      },
      {
        id: 2,
        name: 'Residential Complex',
        progress: 45,
        status: 'In Progress',
        startDate: '2024-03-01',
        endDate: '2024-12-15',
        budget: 800000,
        spent: 360000,
        phase: 'Foundation'
      },
      {
        id: 3,
        name: 'Shopping Mall Renovation',
        progress: 90,
        status: 'Near Completion',
        startDate: '2023-11-01',
        endDate: '2024-02-28',
        budget: 300000,
        spent: 270000,
        phase: 'Finishing'
      },
      {
        id: 4,
        name: 'Industrial Warehouse',
        progress: 100,
        status: 'Completed',
        startDate: '2023-08-01',
        endDate: '2023-12-31',
        budget: 400000,
        spent: 395000,
        phase: 'Completed'
      }
    ];

    res.json({
      success: true,
      data: projectProgress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Project progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project progress',
      error: error.message
    });
  }
};

const getTaskProgress = async (req, res) => {
  try {
    // Mock task progress data
    const taskProgress = [
      {
        id: 1,
        name: 'Foundation Excavation',
        projectId: 1,
        projectName: 'Office Building Construction',
        progress: 100,
        status: 'Completed',
        assignedTo: 'John Smith',
        dueDate: '2024-02-15',
        priority: 'High',
        phase: 'Foundation'
      },
      {
        id: 2,
        name: 'Steel Frame Installation',
        projectId: 1,
        projectName: 'Office Building Construction',
        progress: 80,
        status: 'In Progress',
        assignedTo: 'Mike Johnson',
        dueDate: '2024-04-30',
        priority: 'High',
        phase: 'Construction'
      },
      {
        id: 3,
        name: 'Electrical Wiring',
        projectId: 1,
        projectName: 'Office Building Construction',
        progress: 60,
        status: 'In Progress',
        assignedTo: 'Sarah Wilson',
        dueDate: '2024-05-15',
        priority: 'Medium',
        phase: 'MEP'
      },
      {
        id: 4,
        name: 'Interior Finishing',
        projectId: 1,
        projectName: 'Office Building Construction',
        progress: 30,
        status: 'Not Started',
        assignedTo: 'David Brown',
        dueDate: '2024-06-15',
        priority: 'Medium',
        phase: 'Finishing'
      },
      {
        id: 5,
        name: 'Site Preparation',
        projectId: 2,
        projectName: 'Residential Complex',
        progress: 100,
        status: 'Completed',
        assignedTo: 'Lisa Davis',
        dueDate: '2024-03-15',
        priority: 'High',
        phase: 'Pre-Construction'
      }
    ];

    res.json({
      success: true,
      data: taskProgress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Task progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task progress',
      error: error.message
    });
  }
};

const getCostVariance = async (req, res) => {
  try {
    // Mock cost variance data
    const costVariance = [
      {
        id: 1,
        projectName: 'Office Building Construction',
        budgetedCost: 500000,
        actualCost: 375000,
        variance: -125000,
        variancePercentage: -25,
        status: 'Under Budget',
        category: 'Labor',
        month: '2024-01'
      },
      {
        id: 2,
        projectName: 'Office Building Construction',
        budgetedCost: 200000,
        actualCost: 180000,
        variance: -20000,
        variancePercentage: -10,
        status: 'Under Budget',
        category: 'Materials',
        month: '2024-01'
      },
      {
        id: 3,
        projectName: 'Residential Complex',
        budgetedCost: 300000,
        actualCost: 360000,
        variance: 60000,
        variancePercentage: 20,
        status: 'Over Budget',
        category: 'Labor',
        month: '2024-01'
      },
      {
        id: 4,
        projectName: 'Shopping Mall Renovation',
        budgetedCost: 150000,
        actualCost: 135000,
        variance: -15000,
        variancePercentage: -10,
        status: 'Under Budget',
        category: 'Materials',
        month: '2024-01'
      },
      {
        id: 5,
        projectName: 'Industrial Warehouse',
        budgetedCost: 100000,
        actualCost: 105000,
        variance: 5000,
        variancePercentage: 5,
        status: 'Over Budget',
        category: 'Equipment',
        month: '2024-01'
      }
    ];

    res.json({
      success: true,
      data: costVariance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cost variance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cost variance data',
      error: error.message
    });
  }
};

const getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Mock recent activities data
    const recentActivities = [
      {
        id: 1,
        type: 'task_completed',
        message: 'Foundation Excavation completed by John Smith',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        projectId: 1,
        projectName: 'Office Building Construction',
        userId: 'user1',
        userName: 'John Smith'
      },
      {
        id: 2,
        type: 'project_updated',
        message: 'Project status updated to In Progress',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        projectId: 2,
        projectName: 'Residential Complex',
        userId: 'user2',
        userName: 'Jane Smith'
      },
      {
        id: 3,
        type: 'cost_updated',
        message: 'Budget variance reported: +5% over budget',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        projectId: 1,
        projectName: 'Office Building Construction',
        userId: 'user3',
        userName: 'Mike Johnson'
      },
      {
        id: 4,
        type: 'user_login',
        message: 'User logged in successfully',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
        projectId: null,
        projectName: null,
        userId: 'user4',
        userName: 'Sarah Wilson'
      },
      {
        id: 5,
        type: 'task_created',
        message: 'New task created: Steel Frame Installation',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        projectId: 1,
        projectName: 'Office Building Construction',
        userId: 'user1',
        userName: 'John Smith'
      }
    ];

    // Limit the results
    const limitedActivities = recentActivities.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: limitedActivities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities',
      error: error.message
    });
  }
};

// Dashboard routes
router.get('/stats', authenticateToken, getStats);
router.get('/project-progress', authenticateToken, getProjectProgress);
router.get('/task-progress', authenticateToken, getTaskProgress);
router.get('/cost-variance', authenticateToken, getCostVariance);
router.get('/recent-activities', authenticateToken, getRecentActivities);

module.exports = router;
