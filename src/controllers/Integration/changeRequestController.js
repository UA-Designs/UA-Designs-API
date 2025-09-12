const { ChangeRequest, Project, User, ChangeImpact } = require('../../models');
const { Op } = require('sequelize');

/**
 * Change Request Controller
 * Handles change request CRUD operations and approval workflows
 */
class ChangeRequestController {
  
  /**
   * Get all change requests with filtering
   */
  async getChangeRequests(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        changeType, 
        priority,
        impactLevel,
        projectId,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Apply filters
      if (status) {
        where.currentStatus = status;
      }

      if (changeType) {
        where.changeType = changeType;
      }

      if (priority) {
        where.priority = priority;
      }

      if (impactLevel) {
        where.impactLevel = impactLevel;
      }

      if (projectId) {
        where.projectId = projectId;
      }

      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { changeRequestNumber: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows: changeRequests } = await ChangeRequest.findAndCountAll({
        where,
        include: [
          { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
          { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'implementer', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: {
          changeRequests,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get change requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get change requests',
        error: error.message
      });
    }
  }

  /**
   * Get change request by ID
   */
  async getChangeRequestById(req, res) {
    try {
      const { id } = req.params;

      const changeRequest = await ChangeRequest.findByPk(id, {
        include: [
          { 
            model: Project, 
            as: 'project',
            include: [
              { model: User, as: 'projectManager', attributes: ['id', 'firstName', 'lastName', 'email'] }
            ]
          },
          { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'implementer', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: ChangeImpact, as: 'impacts' }
        ]
      });

      if (!changeRequest) {
        return res.status(404).json({
          success: false,
          message: 'Change request not found'
        });
      }

      res.json({
        success: true,
        data: changeRequest
      });
    } catch (error) {
      console.error('Get change request by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get change request',
        error: error.message
      });
    }
  }

  /**
   * Create new change request
   */
  async createChangeRequest(req, res) {
    try {
      const {
        projectId,
        title,
        description,
        changeType,
        priority,
        impactLevel,
        businessJustification,
        impactAnalysis,
        costImpact,
        scheduleImpact,
        scopeImpact,
        qualityImpact,
        riskImpact,
        alternativesConsidered,
        recommendedSolution,
        implementationPlan,
        changeControlBoard,
        ccbReviewDate,
        attachments,
        tags
      } = req.body;

      const requesterId = req.user.id;

      // Validate required fields
      if (!projectId || !title || !description || !changeType) {
        return res.status(400).json({
          success: false,
          message: 'Project ID, title, description, and change type are required'
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

      // Generate change request number
      const changeRequestNumber = await this.generateChangeRequestNumber();

      // Create change request
      const changeRequest = await ChangeRequest.create({
        projectId,
        changeRequestNumber,
        title,
        description,
        changeType,
        priority: priority || 'MEDIUM',
        impactLevel: impactLevel || 'MEDIUM',
        requestedBy: requesterId,
        requestedAt: new Date(),
        currentStatus: 'DRAFT',
        businessJustification,
        impactAnalysis: impactAnalysis || {},
        costImpact,
        scheduleImpact,
        scopeImpact,
        qualityImpact,
        riskImpact,
        alternativesConsidered: alternativesConsidered || [],
        recommendedSolution,
        implementationPlan: implementationPlan || {},
        changeControlBoard: changeControlBoard || [],
        ccbReviewDate,
        attachments: attachments || [],
        tags: tags || []
      });

      // Load the created change request with associations
      const createdChangeRequest = await ChangeRequest.findByPk(changeRequest.id, {
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Change request created successfully',
        data: createdChangeRequest
      });
    } catch (error) {
      console.error('Create change request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create change request',
        error: error.message
      });
    }
  }

  /**
   * Update change request
   */
  async updateChangeRequest(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const changeRequest = await ChangeRequest.findByPk(id);
      if (!changeRequest) {
        return res.status(404).json({
          success: false,
          message: 'Change request not found'
        });
      }

      // Check if change request can be updated
      if (['APPROVED', 'IMPLEMENTED', 'CLOSED'].includes(changeRequest.currentStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update change request in current status'
        });
      }

      // Update change request
      await changeRequest.update(updateData);

      // Load updated change request with associations
      const updatedChangeRequest = await ChangeRequest.findByPk(id, {
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'implementer', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      });

      res.json({
        success: true,
        message: 'Change request updated successfully',
        data: updatedChangeRequest
      });
    } catch (error) {
      console.error('Update change request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update change request',
        error: error.message
      });
    }
  }

  /**
   * Delete change request
   */
  async deleteChangeRequest(req, res) {
    try {
      const { id } = req.params;

      const changeRequest = await ChangeRequest.findByPk(id);
      if (!changeRequest) {
        return res.status(404).json({
          success: false,
          message: 'Change request not found'
        });
      }

      // Check if change request can be deleted
      if (['APPROVED', 'IMPLEMENTED', 'CLOSED'].includes(changeRequest.currentStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete change request in current status'
        });
      }

      await changeRequest.destroy();

      res.json({
        success: true,
        message: 'Change request deleted successfully'
      });
    } catch (error) {
      console.error('Delete change request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete change request',
        error: error.message
      });
    }
  }

  /**
   * Approve change request
   */
  async approveChangeRequest(req, res) {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const approverId = req.user.id;

      const changeRequest = await ChangeRequest.findByPk(id);
      if (!changeRequest) {
        return res.status(404).json({
          success: false,
          message: 'Change request not found'
        });
      }

      // Check if change request can be approved
      if (!['SUBMITTED', 'UNDER_REVIEW'].includes(changeRequest.currentStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Change request is not in a state that can be approved'
        });
      }

      // Update change request status
      await changeRequest.update({
        currentStatus: 'APPROVED',
        approvedBy: approverId,
        approvedAt: new Date(),
        ccbDecision: 'APPROVED',
        ccbComments: comments
      });

      // Load updated change request with associations
      const updatedChangeRequest = await ChangeRequest.findByPk(id, {
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      });

      res.json({
        success: true,
        message: 'Change request approved successfully',
        data: updatedChangeRequest
      });
    } catch (error) {
      console.error('Approve change request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve change request',
        error: error.message
      });
    }
  }

  /**
   * Reject change request
   */
  async rejectChangeRequest(req, res) {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const approverId = req.user.id;

      const changeRequest = await ChangeRequest.findByPk(id);
      if (!changeRequest) {
        return res.status(404).json({
          success: false,
          message: 'Change request not found'
        });
      }

      // Check if change request can be rejected
      if (!['SUBMITTED', 'UNDER_REVIEW'].includes(changeRequest.currentStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Change request is not in a state that can be rejected'
        });
      }

      // Update change request status
      await changeRequest.update({
        currentStatus: 'REJECTED',
        approvedBy: approverId,
        approvedAt: new Date(),
        ccbDecision: 'REJECTED',
        ccbComments: comments
      });

      // Load updated change request with associations
      const updatedChangeRequest = await ChangeRequest.findByPk(id, {
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      });

      res.json({
        success: true,
        message: 'Change request rejected',
        data: updatedChangeRequest
      });
    } catch (error) {
      console.error('Reject change request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject change request',
        error: error.message
      });
    }
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(req, res) {
    try {
      const { userId } = req.query;

      const where = {
        currentStatus: ['SUBMITTED', 'UNDER_REVIEW']
      };

      // If userId is provided, filter by user's approval responsibilities
      if (userId) {
        // This would need to be implemented based on your approval workflow logic
        // For now, we'll get all pending approvals
      }

      const pendingApprovals = await ChangeRequest.findAll({
        where,
        include: [
          { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
          { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [['requestedAt', 'ASC']]
      });

      res.json({
        success: true,
        data: pendingApprovals
      });
    } catch (error) {
      console.error('Get pending approvals error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pending approvals',
        error: error.message
      });
    }
  }

  /**
   * Get change requests by project
   */
  async getChangeRequestsByProject(req, res) {
    try {
      const { projectId } = req.params;
      const { status, changeType } = req.query;

      const where = { projectId };
      if (status) {
        where.currentStatus = status;
      }
      if (changeType) {
        where.changeType = changeType;
      }

      const changeRequests = await ChangeRequest.findAll({
        where,
        include: [
          { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'implementer', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [['requestedAt', 'DESC']]
      });

      res.json({
        success: true,
        data: changeRequests
      });
    } catch (error) {
      console.error('Get change requests by project error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get change requests',
        error: error.message
      });
    }
  }

  /**
   * Perform impact analysis
   */
  async performImpactAnalysis(req, res) {
    try {
      const { id } = req.params;
      const impactData = req.body;

      const changeRequest = await ChangeRequest.findByPk(id);
      if (!changeRequest) {
        return res.status(404).json({
          success: false,
          message: 'Change request not found'
        });
      }

      // Create impact analysis record
      const impact = await ChangeImpact.create({
        changeRequestId: id,
        projectId: changeRequest.projectId,
        impactType: impactData.impactType,
        impactLevel: impactData.impactLevel,
        impactDescription: impactData.impactDescription,
        scopeImpact: impactData.scopeImpact,
        scheduleImpact: impactData.scheduleImpact,
        costImpact: impactData.costImpact,
        qualityImpact: impactData.qualityImpact,
        resourceImpact: impactData.resourceImpact,
        riskImpact: impactData.riskImpact,
        stakeholderImpact: impactData.stakeholderImpact,
        technicalImpact: impactData.technicalImpact,
        regulatoryImpact: impactData.regulatoryImpact,
        safetyImpact: impactData.safetyImpact,
        environmentalImpact: impactData.environmentalImpact,
        quantifiedImpact: impactData.quantifiedImpact,
        mitigationStrategies: impactData.mitigationStrategies,
        contingencyPlans: impactData.contingencyPlans,
        dependencies: impactData.dependencies,
        affectedTasks: impactData.affectedTasks,
        affectedResources: impactData.affectedResources,
        affectedStakeholders: impactData.affectedStakeholders,
        impactTimeline: impactData.impactTimeline,
        recoveryTime: impactData.recoveryTime,
        impactProbability: impactData.impactProbability,
        impactSeverity: impactData.impactSeverity,
        riskScore: impactData.riskScore,
        businessImpact: impactData.businessImpact,
        customerImpact: impactData.customerImpact,
        operationalImpact: impactData.operationalImpact,
        financialImpact: impactData.financialImpact,
        reputationImpact: impactData.reputationImpact,
        complianceImpact: impactData.complianceImpact,
        analyzedBy: req.user.id,
        analyzedAt: new Date(),
        reviewStatus: 'DRAFT',
        constructionImpact: impactData.constructionImpact,
        weatherImpact: impactData.weatherImpact,
        permitImpact: impactData.permitImpact,
        subcontractorImpact: impactData.subcontractorImpact,
        materialImpact: impactData.materialImpact,
        equipmentImpact: impactData.equipmentImpact,
        laborImpact: impactData.laborImpact,
        siteImpact: impactData.siteImpact,
        neighborImpact: impactData.neighborImpact,
        trafficImpact: impactData.trafficImpact,
        noiseImpact: impactData.noiseImpact,
        dustImpact: impactData.dustImpact,
        vibrationImpact: impactData.vibrationImpact,
        attachments: impactData.attachments,
        tags: impactData.tags,
        notes: impactData.notes
      });

      res.status(201).json({
        success: true,
        message: 'Impact analysis created successfully',
        data: impact
      });
    } catch (error) {
      console.error('Perform impact analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform impact analysis',
        error: error.message
      });
    }
  }

  /**
   * Get impact summary
   */
  async getImpactSummary(req, res) {
    try {
      const { projectId } = req.params;

      const impacts = await ChangeImpact.findAll({
        where: { projectId },
        include: [
          { model: ChangeRequest, as: 'changeRequest', attributes: ['id', 'title', 'changeType'] }
        ],
        order: [['analyzedAt', 'DESC']]
      });

      // Group impacts by type and level
      const summary = {
        total: impacts.length,
        byType: {},
        byLevel: {},
        byStatus: {},
        recent: impacts.slice(0, 10)
      };

      impacts.forEach(impact => {
        // Count by type
        if (!summary.byType[impact.impactType]) {
          summary.byType[impact.impactType] = 0;
        }
        summary.byType[impact.impactType]++;

        // Count by level
        if (!summary.byLevel[impact.impactLevel]) {
          summary.byLevel[impact.impactLevel] = 0;
        }
        summary.byLevel[impact.impactLevel]++;

        // Count by status
        if (!summary.byStatus[impact.reviewStatus]) {
          summary.byStatus[impact.reviewStatus] = 0;
        }
        summary.byStatus[impact.reviewStatus]++;
      });

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Get impact summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get impact summary',
        error: error.message
      });
    }
  }

  // Helper methods
  async generateChangeRequestNumber() {
    const year = new Date().getFullYear();
    const count = await ChangeRequest.count({
      where: {
        changeRequestNumber: {
          [Op.like]: `CR-${year}-%`
        }
      }
    });
    
    const sequence = String(count + 1).padStart(4, '0');
    return `CR-${year}-${sequence}`;
  }
}

module.exports = new ChangeRequestController();
