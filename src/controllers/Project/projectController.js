const { Project, User, Task, Budget, Expense, Risk, Stakeholder, Material, Labor, Equipment } = require('../../models');
const { validationResult } = require('express-validator');

class ProjectController {
  // Create a new project
  static async createProject(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const {
        name,
        description,
        startDate,
        endDate,
        budget,
        projectManagerId,
        clientName,
        clientEmail,
        clientPhone,
        location,
        projectType,
        priority
      } = req.body;

      // Check if project manager exists
      if (projectManagerId) {
        const projectManager = await User.findByPk(projectManagerId);
        if (!projectManager) {
          return res.status(404).json({
            success: false,
            message: 'Project manager not found'
          });
        }
      }

      const project = await Project.create({
        name,
        description,
        startDate,
        endDate,
        budget,
        projectManagerId,
        clientName,
        clientEmail,
        clientPhone,
        location,
        projectType,
        priority
      });

      // Include project manager details in response
      const projectWithManager = await Project.findByPk(project.id, {
        include: [{
          model: User,
          as: 'projectManager',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: projectWithManager
      });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get all projects with filtering and pagination
  static async getAllProjects(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        projectType,
        priority,
        projectManagerId,
        search
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Apply filters
      if (status) where.status = status;
      if (projectType) where.projectType = projectType;
      if (priority) where.priority = priority;
      if (projectManagerId) where.projectManagerId = projectManagerId;
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { clientName: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows: projects } = await Project.findAndCountAll({
        where,
        include: [{
          model: User,
          as: 'projectManager',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: projects,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get a single project by ID with all related data
  static async getProjectById(req, res) {
    try {
      const { id } = req.params;

      const project = await Project.findByPk(id, {
        include: [
          {
            model: User,
            as: 'projectManager',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: Task,
            as: 'tasks',
            attributes: ['id', 'name', 'status', 'priority', 'startDate', 'endDate', 'progress']
          },
          {
            model: Budget,
            as: 'budgets',
            attributes: ['id', 'name', 'totalAmount', 'spentAmount', 'remainingAmount', 'status']
          },
          {
            model: Risk,
            as: 'risks',
            attributes: ['id', 'title', 'category', 'probability', 'impact', 'riskScore', 'status']
          },
          {
            model: Stakeholder,
            as: 'stakeholders',
            attributes: ['id', 'name', 'role', 'influence', 'interest']
          }
        ]
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Update a project
  static async updateProject(req, res) {
    try {
      const { id } = req.params;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const project = await Project.findByPk(id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const updateData = req.body;

      // Check if project manager exists
      if (updateData.projectManagerId) {
        const projectManager = await User.findByPk(updateData.projectManagerId);
        if (!projectManager) {
          return res.status(404).json({
            success: false,
            message: 'Project manager not found'
          });
        }
      }

      await project.update(updateData);

      // Fetch updated project with relations
      const updatedProject = await Project.findByPk(id, {
        include: [{
          model: User,
          as: 'projectManager',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      res.json({
        success: true,
        message: 'Project updated successfully',
        data: updatedProject
      });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Delete a project (soft delete)
  static async deleteProject(req, res) {
    try {
      const { id } = req.params;

      const project = await Project.findByPk(id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      await project.destroy();

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get project dashboard data
  static async getProjectDashboard(req, res) {
    try {
      const { id } = req.params;

      const project = await Project.findByPk(id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Get counts for each PMBOK area
      const [
        taskCount,
        budgetCount,
        riskCount,
        stakeholderCount,
        resourceCount
      ] = await Promise.all([
        Task.count({ where: { projectId: id } }),
        Budget.count({ where: { projectId: id } }),
        Risk.count({ where: { projectId: id } }),
        Stakeholder.count({ where: { projectId: id } }),
        Material.count({ where: { projectId: id } }) + 
        Labor.count({ where: { projectId: id } }) + 
        Equipment.count({ where: { projectId: id } })
      ]);

      // Get recent activities (last 5 tasks, risks, etc.)
      const recentTasks = await Task.findAll({
        where: { projectId: id },
        order: [['updatedAt', 'DESC']],
        limit: 5,
        attributes: ['id', 'name', 'status', 'updatedAt']
      });

      const recentRisks = await Risk.findAll({
        where: { projectId: id },
        order: [['updatedAt', 'DESC']],
        limit: 5,
        attributes: ['id', 'title', 'status', 'riskScore', 'updatedAt']
      });

      const dashboardData = {
        project: project.getProjectSummary(),
        pmbokAreas: {
          schedule: { count: taskCount, label: 'Tasks' },
          cost: { count: budgetCount, label: 'Budgets' },
          risk: { count: riskCount, label: 'Risks' },
          stakeholders: { count: stakeholderCount, label: 'Stakeholders' },
          resources: { count: resourceCount, label: 'Resources' }
        },
        recentActivities: {
          tasks: recentTasks,
          risks: recentRisks
        },
        projectHealth: {
          isOverdue: project.isOverdue(),
          daysRemaining: project.getDaysRemaining(),
          progress: project.progress
        }
      };

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Error fetching project dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get project statistics
  static async getProjectStats(req, res) {
    try {
      const totalProjects = await Project.count();
      const activeProjects = await Project.count({ where: { status: 'active' } });
      const completedProjects = await Project.count({ where: { status: 'completed' } });
      const overdueProjects = await Project.count({
        where: {
          endDate: { [Op.lt]: new Date() },
          status: { [Op.not]: 'completed' }
        }
      });

      const projectsByType = await Project.findAll({
        attributes: [
          'projectType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['projectType'],
        raw: true
      });

      const projectsByStatus = await Project.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      res.json({
        success: true,
        data: {
          total: totalProjects,
          active: activeProjects,
          completed: completedProjects,
          overdue: overdueProjects,
          byType: projectsByType,
          byStatus: projectsByStatus
        }
      });
    } catch (error) {
      console.error('Error fetching project stats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = ProjectController;
