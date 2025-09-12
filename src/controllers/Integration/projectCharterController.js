const { ProjectCharter, Project, User, ProjectTemplate } = require('../../models');
const { Op } = require('sequelize');

/**
 * Project Charter Controller
 * Handles project charter CRUD operations and approval workflows
 */
class ProjectCharterController {
  
  /**
   * Get all project charters with filtering
   */
  async getCharters(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        projectType, 
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Apply filters
      if (status) {
        where.approvalStatus = status;
      }

      if (search) {
        where[Op.or] = [
          { projectTitle: { [Op.iLike]: `%${search}%` } },
          { charterNumber: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows: charters } = await ProjectCharter.findAndCountAll({
        where,
        include: [
          { 
            model: Project, 
            as: 'project',
            where: projectType ? { projectType } : undefined,
            required: false
          },
          { model: User, as: 'sponsor', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'charterManager', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: {
          charters,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get charters error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get project charters',
        error: error.message
      });
    }
  }

  /**
   * Get project charter by ID
   */
  async getCharterById(req, res) {
    try {
      const { id } = req.params;

      const charter = await ProjectCharter.findByPk(id, {
        include: [
          { 
            model: Project, 
            as: 'project',
            include: [
              { model: User, as: 'projectManager', attributes: ['id', 'firstName', 'lastName', 'email'] }
            ]
          },
          { model: User, as: 'sponsor', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'charterManager', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      });

      if (!charter) {
        return res.status(404).json({
          success: false,
          message: 'Project charter not found'
        });
      }

      res.json({
        success: true,
        data: charter
      });
    } catch (error) {
      console.error('Get charter by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get project charter',
        error: error.message
      });
    }
  }

  /**
   * Create new project charter
   */
  async createCharter(req, res) {
    try {
      const {
        projectId,
        projectTitle,
        projectDescription,
        businessCase,
        projectObjectives,
        successCriteria,
        highLevelRequirements,
        projectScope,
        projectDeliverables,
        projectConstraints,
        projectAssumptions,
        highLevelRisks,
        summaryMilestoneSchedule,
        summaryBudget,
        projectSponsor,
        projectManager,
        keyStakeholders,
        templateId
      } = req.body;

      // Validate required fields
      if (!projectId || !projectTitle || !projectDescription) {
        return res.status(400).json({
          success: false,
          message: 'Project ID, title, and description are required'
        });
      }

      // Check if project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Check if charter already exists for this project
      const existingCharter = await ProjectCharter.findOne({
        where: { projectId }
      });

      if (existingCharter) {
        return res.status(400).json({
          success: false,
          message: 'Project charter already exists for this project'
        });
      }

      // Generate charter number
      const charterNumber = await this.generateCharterNumber();

      // Create charter
      const charter = await ProjectCharter.create({
        projectId,
        charterNumber,
        projectTitle,
        projectDescription,
        businessCase,
        projectObjectives: projectObjectives || [],
        successCriteria: successCriteria || [],
        highLevelRequirements: highLevelRequirements || [],
        projectScope,
        projectDeliverables: projectDeliverables || [],
        projectConstraints: projectConstraints || [],
        projectAssumptions: projectAssumptions || [],
        highLevelRisks: highLevelRisks || [],
        summaryMilestoneSchedule: summaryMilestoneSchedule || [],
        summaryBudget,
        projectSponsor,
        projectManager,
        keyStakeholders: keyStakeholders || [],
        approvalStatus: 'DRAFT'
      });

      // Load the created charter with associations
      const createdCharter = await ProjectCharter.findByPk(charter.id, {
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'sponsor', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'charterManager', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Project charter created successfully',
        data: createdCharter
      });
    } catch (error) {
      console.error('Create charter error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create project charter',
        error: error.message
      });
    }
  }

  /**
   * Update project charter
   */
  async updateCharter(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const charter = await ProjectCharter.findByPk(id);
      if (!charter) {
        return res.status(404).json({
          success: false,
          message: 'Project charter not found'
        });
      }

      // Check if charter can be updated
      if (charter.approvalStatus === 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update approved charter. Create a new version instead.'
        });
      }

      // Update charter
      await charter.update(updateData);

      // Load updated charter with associations
      const updatedCharter = await ProjectCharter.findByPk(id, {
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'sponsor', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'charterManager', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      });

      res.json({
        success: true,
        message: 'Project charter updated successfully',
        data: updatedCharter
      });
    } catch (error) {
      console.error('Update charter error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update project charter',
        error: error.message
      });
    }
  }

  /**
   * Delete project charter
   */
  async deleteCharter(req, res) {
    try {
      const { id } = req.params;

      const charter = await ProjectCharter.findByPk(id);
      if (!charter) {
        return res.status(404).json({
          success: false,
          message: 'Project charter not found'
        });
      }

      // Check if charter can be deleted
      if (charter.approvalStatus === 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete approved charter'
        });
      }

      await charter.destroy();

      res.json({
        success: true,
        message: 'Project charter deleted successfully'
      });
    } catch (error) {
      console.error('Delete charter error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete project charter',
        error: error.message
      });
    }
  }

  /**
   * Approve project charter
   */
  async approveCharter(req, res) {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const approverId = req.user.id;

      const charter = await ProjectCharter.findByPk(id);
      if (!charter) {
        return res.status(404).json({
          success: false,
          message: 'Project charter not found'
        });
      }

      // Check if charter can be approved
      if (charter.approvalStatus !== 'PENDING_APPROVAL') {
        return res.status(400).json({
          success: false,
          message: 'Charter is not pending approval'
        });
      }

      // Update charter status
      await charter.update({
        approvalStatus: 'APPROVED',
        approvedBy: approverId,
        approvedAt: new Date(),
        approvalComments: comments
      });

      // Load updated charter with associations
      const updatedCharter = await ProjectCharter.findByPk(id, {
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'sponsor', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'charterManager', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      });

      res.json({
        success: true,
        message: 'Project charter approved successfully',
        data: updatedCharter
      });
    } catch (error) {
      console.error('Approve charter error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve project charter',
        error: error.message
      });
    }
  }

  /**
   * Reject project charter
   */
  async rejectCharter(req, res) {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const approverId = req.user.id;

      const charter = await ProjectCharter.findByPk(id);
      if (!charter) {
        return res.status(404).json({
          success: false,
          message: 'Project charter not found'
        });
      }

      // Check if charter can be rejected
      if (charter.approvalStatus !== 'PENDING_APPROVAL') {
        return res.status(400).json({
          success: false,
          message: 'Charter is not pending approval'
        });
      }

      // Update charter status
      await charter.update({
        approvalStatus: 'REJECTED',
        approvedBy: approverId,
        approvedAt: new Date(),
        approvalComments: comments
      });

      // Load updated charter with associations
      const updatedCharter = await ProjectCharter.findByPk(id, {
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'sponsor', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'charterManager', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      });

      res.json({
        success: true,
        message: 'Project charter rejected',
        data: updatedCharter
      });
    } catch (error) {
      console.error('Reject charter error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject project charter',
        error: error.message
      });
    }
  }

  /**
   * Get available templates
   */
  async getTemplates(req, res) {
    try {
      const { projectType } = req.query;

      const where = { isActive: true };
      if (projectType) {
        where.projectType = projectType;
      }

      const templates = await ProjectTemplate.findAll({
        where,
        order: [['isDefault', 'DESC'], ['templateName', 'ASC']]
      });

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get templates',
        error: error.message
      });
    }
  }

  /**
   * Create custom template
   */
  async createTemplate(req, res) {
    try {
      const templateData = req.body;
      templateData.createdBy = req.user.id;

      const template = await ProjectTemplate.create(templateData);

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: template
      });
    } catch (error) {
      console.error('Create template error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create template',
        error: error.message
      });
    }
  }

  /**
   * Get charter by project
   */
  async getCharterByProject(req, res) {
    try {
      const { projectId } = req.params;

      const charter = await ProjectCharter.findOne({
        where: { projectId },
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'sponsor', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'charterManager', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      });

      if (!charter) {
        return res.status(404).json({
          success: false,
          message: 'No charter found for this project'
        });
      }

      res.json({
        success: true,
        data: charter
      });
    } catch (error) {
      console.error('Get charter by project error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get project charter',
        error: error.message
      });
    }
  }

  // Helper methods
  async generateCharterNumber() {
    const year = new Date().getFullYear();
    const count = await ProjectCharter.count({
      where: {
        charterNumber: {
          [Op.like]: `PC-${year}-%`
        }
      }
    });
    
    const sequence = String(count + 1).padStart(4, '0');
    return `PC-${year}-${sequence}`;
  }
}

module.exports = new ProjectCharterController();
