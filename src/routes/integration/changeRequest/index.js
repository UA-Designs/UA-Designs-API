const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { 
  ProjectCharter, 
  ChangeRequest, 
  ProjectClosure, 
  Project, 
  User 
} = require('../../models');

// ========================================
// PROJECT CHARTER MANAGEMENT
// ========================================

// Create a new project charter
router.post('/charters', authenticateToken, authorizeRoles(['ADMIN', 'PROJECT_MANAGER']), async (req, res) => {
  try {
    const {
      projectId,
      charterNumber,
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
      keyStakeholders
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'projectId', 'charterNumber', 'projectTitle', 'projectDescription',
      'projectObjectives', 'successCriteria', 'projectDeliverables',
      'projectSponsor', 'projectManager'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
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
    const existingCharter = await ProjectCharter.findOne({ where: { projectId } });
    if (existingCharter) {
      return res.status(400).json({
        success: false,
        message: 'Project charter already exists for this project'
      });
    }

    // Create charter
    const charter = await ProjectCharter.create({
      projectId,
      charterNumber,
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
      approvalStatus: 'DRAFT'
    });

    res.status(201).json({
      success: true,
      message: 'Project charter created successfully',
      data: charter
    });
  } catch (error) {
    console.error('Create charter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project charter',
      error: error.message
    });
  }
});

// Get all project charters
router.get('/charters', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, projectId } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    if (status) whereClause.approvalStatus = status;
    if (projectId) whereClause.projectId = projectId;

    const charters = await ProjectCharter.findAndCountAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
        { model: User, as: 'sponsor', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'charterManager', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: charters.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(charters.count / limit),
        totalItems: charters.count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get charters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project charters',
      error: error.message
    });
  }
});

// Get a specific project charter
router.get('/charters/:id', authenticateToken, async (req, res) => {
  try {
    const charter = await ProjectCharter.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status', 'description'] },
        { model: User, as: 'sponsor', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
        { model: User, as: 'charterManager', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }
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
    console.error('Get charter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project charter',
      error: error.message
    });
  }
});

// Update project charter
router.put('/charters/:id', authenticateToken, authorizeRoles(['ADMIN', 'PROJECT_MANAGER']), async (req, res) => {
  try {
    const charter = await ProjectCharter.findByPk(req.params.id);
    if (!charter) {
      return res.status(404).json({
        success: false,
        message: 'Project charter not found'
      });
    }

    // Only allow updates if charter is in DRAFT status
    if (charter.approvalStatus !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update charter that is not in DRAFT status'
      });
    }

    const updatedCharter = await charter.update(req.body);
    
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
});

// Submit charter for approval
router.post('/charters/:id/submit', authenticateToken, authorizeRoles(['ADMIN', 'PROJECT_MANAGER']), async (req, res) => {
  try {
    const charter = await ProjectCharter.findByPk(req.params.id);
    if (!charter) {
      return res.status(404).json({
        success: false,
        message: 'Project charter not found'
      });
    }

    if (charter.approvalStatus !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Charter is not in DRAFT status'
      });
    }

    await charter.update({ approvalStatus: 'PENDING_APPROVAL' });
    
    res.json({
      success: true,
      message: 'Project charter submitted for approval',
      data: charter
    });
  } catch (error) {
    console.error('Submit charter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit project charter',
      error: error.message
    });
  }
});

// Approve/Reject charter
router.post('/charters/:id/review', authenticateToken, authorizeRoles(['ADMIN', 'PROJECT_SPONSOR']), async (req, res) => {
  try {
    const { decision, comments } = req.body;
    const charter = await ProjectCharter.findByPk(req.params.id);
    
    if (!charter) {
      return res.status(404).json({
        success: false,
        message: 'Project charter not found'
      });
    }

    if (charter.approvalStatus !== 'PENDING_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: 'Charter is not pending approval'
      });
    }

    await charter.update({
      approvalStatus: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      approvedBy: req.user.id,
      approvedAt: new Date(),
      approvalComments: comments
    });
    
    res.json({
      success: true,
      message: `Project charter ${decision.toLowerCase()}`,
      data: charter
    });
  } catch (error) {
    console.error('Review charter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review project charter',
      error: error.message
    });
  }
});

// ========================================
// CHANGE REQUEST MANAGEMENT
// ========================================

// Create a new change request
router.post('/change-requests', authenticateToken, async (req, res) => {
  try {
    const {
      projectId,
      changeRequestNumber,
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
      implementationPlan
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'projectId', 'changeRequestNumber', 'title', 'description',
      'changeType', 'businessJustification'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
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

    // Create change request
    const changeRequest = await ChangeRequest.create({
      projectId,
      changeRequestNumber,
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
      requestedBy: req.user.id,
      currentStatus: 'DRAFT'
    });

    res.status(201).json({
      success: true,
      message: 'Change request created successfully',
      data: changeRequest
    });
  } catch (error) {
    console.error('Create change request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create change request',
      error: error.message
    });
  }
});

// Get all change requests
router.get('/change-requests', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, projectId, changeType, priority } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    if (status) whereClause.currentStatus = status;
    if (projectId) whereClause.projectId = projectId;
    if (changeType) whereClause.changeType = changeType;
    if (priority) whereClause.priority = priority;

    const changeRequests = await ChangeRequest.findAndCountAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
        { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: changeRequests.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(changeRequests.count / limit),
        totalItems: changeRequests.count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get change requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch change requests',
      error: error.message
    });
  }
});

// Get a specific change request
router.get('/change-requests/:id', authenticateToken, async (req, res) => {
  try {
    const changeRequest = await ChangeRequest.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status', 'description'] },
        { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }
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
    console.error('Get change request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch change request',
      error: error.message
    });
  }
});

// Submit change request for review
router.post('/change-requests/:id/submit', authenticateToken, async (req, res) => {
  try {
    const changeRequest = await ChangeRequest.findByPk(req.params.id);
    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found'
      });
    }

    if (changeRequest.currentStatus !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Change request is not in DRAFT status'
      });
    }

    await changeRequest.update({ currentStatus: 'SUBMITTED' });
    
    res.json({
      success: true,
      message: 'Change request submitted for review',
      data: changeRequest
    });
  } catch (error) {
    console.error('Submit change request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit change request',
      error: error.message
    });
  }
});

// Approve change request (alternative endpoint)
router.patch('/change-requests/:id/approve', authenticateToken, authorizeRoles(['ADMIN', 'PROJECT_MANAGER', 'CHANGE_CONTROL_BOARD']), async (req, res) => {
  try {
    const { decision, comments, ccbReviewDate } = req.body;
    const changeRequest = await ChangeRequest.findByPk(req.params.id);
    
    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found'
      });
    }

    if (changeRequest.currentStatus !== 'SUBMITTED') {
      return res.status(400).json({
        success: false,
        message: 'Change request is not submitted for review'
      });
    }

    const newStatus = decision === 'APPROVED' ? 'APPROVED' : 
                     decision === 'REJECTED' ? 'REJECTED' : 
                     decision === 'APPROVED_WITH_CONDITIONS' ? 'APPROVED' : 'DEFERRED';

    await changeRequest.update({
      currentStatus: newStatus,
      ccbDecision: decision,
      ccbComments: comments,
      ccbReviewDate: ccbReviewDate || new Date(),
      approvedBy: req.user.id,
      approvedAt: new Date()
    });
    
    res.json({
      success: true,
      message: `Change request ${decision.toLowerCase()}`,
      data: changeRequest
    });
  } catch (error) {
    console.error('Approve change request error:', error);
    res.status(500).json({
      success: false,
        message: 'Failed to approve change request',
        error: error.message
      });
    }
  });

// Review change request (CCB)
router.post('/change-requests/:id/review', authenticateToken, authorizeRoles(['ADMIN', 'PROJECT_MANAGER', 'CHANGE_CONTROL_BOARD']), async (req, res) => {
  try {
    const { decision, comments, ccbReviewDate } = req.body;
    const changeRequest = await ChangeRequest.findByPk(req.params.id);
    
    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found'
      });
    }

    if (changeRequest.currentStatus !== 'SUBMITTED') {
      return res.status(400).json({
        success: false,
        message: 'Change request is not submitted for review'
      });
    }

    const newStatus = decision === 'APPROVED' ? 'APPROVED' : 
                     decision === 'REJECTED' ? 'REJECTED' : 
                     decision === 'APPROVED_WITH_CONDITIONS' ? 'APPROVED' : 'DEFERRED';

    await changeRequest.update({
      currentStatus: newStatus,
      ccbDecision: decision,
      ccbComments: comments,
      ccbReviewDate: ccbReviewDate || new Date(),
      approvedBy: req.user.id,
      approvedAt: new Date()
    });
    
    res.json({
      success: true,
      message: `Change request ${decision.toLowerCase()}`,
      data: changeRequest
    });
  } catch (error) {
    console.error('Review change request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review change request',
      error: error.message
    });
  }
});

// ========================================
// PROJECT CLOSURE MANAGEMENT
// ========================================

// Alternative endpoint for project closures (matches requirements)
router.post('/project-closures', authenticateToken, authorizeRoles(['ADMIN', 'PROJECT_MANAGER']), async (req, res) => {
  try {
    const {
      projectId,
      closureNumber,
      closureType,
      closureDate,
      closureReason,
      originalBudget,
      originalSchedule,
      deliverablesStatus
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'projectId', 'closureNumber', 'closureType', 'closureDate', 
      'closureReason', 'deliverablesStatus'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
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

    // Check if closure already exists for this project
    const existingClosure = await ProjectClosure.findOne({ where: { projectId } });
    if (existingClosure) {
      return res.status(400).json({
        success: false,
        message: 'Project closure already exists for this project'
      });
    }

    // Create closure
    const closure = await ProjectClosure.create({
      projectId,
      closureNumber,
      closureType,
      closureDate,
      closureReason,
      projectManager: req.user.id,
      originalBudget,
      originalSchedule,
      deliverablesStatus,
      closureStatus: 'INITIATED'
    });

    res.status(201).json({
      success: true,
      message: 'Project closure document created successfully',
      data: closure
    });
  } catch (error) {
    console.error('Create project closure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project closure document',
      error: error.message
    });
  }
});

// Initiate project closure
router.post('/closures', authenticateToken, authorizeRoles(['ADMIN', 'PROJECT_MANAGER']), async (req, res) => {
  try {
    const {
      projectId,
      closureNumber,
      closureType,
      closureDate,
      closureReason,
      originalBudget,
      originalSchedule,
      deliverablesStatus
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'projectId', 'closureNumber', 'closureType', 'closureDate', 
      'closureReason', 'deliverablesStatus'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
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

    // Check if closure already exists for this project
    const existingClosure = await ProjectClosure.findOne({ where: { projectId } });
    if (existingClosure) {
      return res.status(400).json({
        success: false,
        message: 'Project closure already exists for this project'
      });
    }

    // Create closure
    const closure = await ProjectClosure.create({
      projectId,
      closureNumber,
      closureType,
      closureDate,
      closureReason,
      projectManager: req.user.id,
      originalBudget,
      originalSchedule,
      deliverablesStatus,
      closureStatus: 'INITIATED'
    });

    res.status(201).json({
      success: true,
      message: 'Project closure initiated successfully',
      data: closure
    });
  } catch (error) {
    console.error('Initiate closure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate project closure',
      error: error.message
    });
  }
});

// Get all project closures
router.get('/closures', authenticateToken, async (req, res) => {

// Alternative endpoint for project closures (matches requirements)
router.get('/project-closures', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, projectId, closureType } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    if (status) whereClause.closureStatus = status;
    if (projectId) whereClause.projectId = projectId;
    if (closureType) whereClause.closureType = closureType;

    const closures = await ProjectClosure.findAndCountAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
        { model: User, as: 'closureManager', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: closures.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(closures.count / limit),
        totalItems: closures.count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get project closures error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project closures',
      error: error.message
    });
  }
});
  try {
    const { page = 1, limit = 10, status, projectId, closureType } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    if (status) whereClause.closureStatus = status;
    if (projectId) whereClause.projectId = projectId;
    if (closureType) whereClause.closureType = closureType;

    const closures = await ProjectClosure.findAndCountAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
        { model: User, as: 'closureManager', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: closures.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(closures.count / limit),
        totalItems: closures.count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get closures error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project closures',
      error: error.message
    });
  }
});

// Get a specific project closure
router.get('/closures/:id', authenticateToken, async (req, res) => {
  try {
    const closure = await ProjectClosure.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status', 'description'] },
        { model: User, as: 'closureManager', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }
      ]
    });

    if (!closure) {
      return res.status(404).json({
        success: false,
        message: 'Project closure not found'
      });
    }

    res.json({
      success: true,
      data: closure
    });
  } catch (error) {
    console.error('Get closure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project closure',
      error: error.message
    });
  }
});

// Update project closure
router.put('/closures/:id', authenticateToken, authorizeRoles(['ADMIN', 'PROJECT_MANAGER']), async (req, res) => {
  try {
    const closure = await ProjectClosure.findByPk(req.params.id);
    if (!closure) {
      return res.status(404).json({
        success: false,
        message: 'Project closure not found'
      });
    }

    // Only allow updates if closure is not completed
    if (closure.closureStatus === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed project closure'
      });
    }

    const updatedClosure = await closure.update(req.body);
    
    res.json({
      success: true,
      message: 'Project closure updated successfully',
      data: updatedClosure
    });
  } catch (error) {
    console.error('Update closure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project closure',
      error: error.message
    });
  }
});

// Complete project closure
router.post('/closures/:id/complete', authenticateToken, authorizeRoles(['ADMIN', 'PROJECT_MANAGER']), async (req, res) => {
  try {
    const { finalBudget, actualCompletionDate, scopeCompletion, lessonsLearned, stakeholderSatisfaction } = req.body;
    const closure = await ProjectClosure.findByPk(req.params.id);
    
    if (!closure) {
      return res.status(404).json({
        success: false,
        message: 'Project closure not found'
      });
    }

    if (closure.closureStatus === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Project closure is already completed'
      });
    }

    // Calculate variances
    const budgetVariance = finalBudget && closure.originalBudget ? 
      parseFloat(finalBudget) - parseFloat(closure.originalBudget) : null;
    
    const scheduleVariance = actualCompletionDate && closure.originalSchedule ? 
      Math.ceil((new Date(actualCompletionDate) - new Date(closure.originalSchedule)) / (1000 * 60 * 60 * 24)) : null;

    await closure.update({
      finalBudget,
      actualCompletionDate,
      scopeCompletion,
      lessonsLearned,
      stakeholderSatisfaction,
      budgetVariance,
      scheduleVariance,
      closureStatus: 'COMPLETED',
      closureComments: 'Project closure completed successfully'
    });
    
    res.json({
      success: true,
      message: 'Project closure completed successfully',
      data: closure
    });
  } catch (error) {
    console.error('Complete closure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete project closure',
      error: error.message
    });
  }
});

// ========================================
// CONSTRUCTION-SPECIFIC TEMPLATES
// ========================================

// Get construction project charter template
router.get('/templates/charter/construction', authenticateToken, async (req, res) => {
  try {
    const template = {
      projectType: 'CONSTRUCTION',
      templateName: 'Standard Construction Project Charter',
      sections: {
        projectObjectives: [
          'Complete construction within specified timeline',
          'Maintain safety standards throughout project',
          'Achieve quality benchmarks per specifications',
          'Stay within approved budget constraints',
          'Comply with all regulatory requirements'
        ],
        successCriteria: [
          'Zero safety incidents',
          'Quality inspection pass rate >95%',
          'Budget variance <5%',
          'Schedule adherence >90%',
          'Stakeholder satisfaction >8.5/10'
        ],
        projectDeliverables: [
          'Completed construction project',
          'As-built drawings and documentation',
          'Safety compliance certificates',
          'Quality assurance reports',
          'Operation and maintenance manuals'
        ],
        highLevelRisks: [
          'Weather delays and natural disasters',
          'Material supply chain disruptions',
          'Regulatory compliance changes',
          'Labor availability and skill gaps',
          'Equipment breakdowns and maintenance'
        ],
        projectConstraints: [
          'Seasonal weather limitations',
          'Local building codes and regulations',
          'Environmental impact considerations',
          'Traffic and access restrictions',
          'Noise and dust control requirements'
        ]
      }
    };

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Get construction template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch construction template',
      error: error.message
    });
  }
});

// Get construction change request template
router.get('/templates/change-request/construction', authenticateToken, async (req, res) => {
  try {
    const template = {
      changeType: 'CONSTRUCTION_MODIFICATION',
      templateName: 'Construction Change Request Template',
      sections: {
        impactAnalysis: {
          structural: 'Structural integrity assessment required',
          safety: 'Safety protocol updates needed',
          schedule: 'Timeline impact analysis',
          cost: 'Material and labor cost impact',
          quality: 'Quality control measures'
        },
        alternativesConsidered: [
          'Alternative construction methods',
          'Different material options',
          'Modified timeline approaches',
          'Cost-effective alternatives'
        ],
        implementationPlan: [
          'Engineering review and approval',
          'Safety assessment and protocols',
          'Material procurement timeline',
          'Labor and equipment allocation',
          'Quality control procedures'
        ]
      }
    };

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Get change request template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch change request template',
      error: error.message
    });
  }
});

// ========================================
// INTELLIGENT APPROVAL ROUTING
// ========================================

// Get approval routing based on change impact
router.get('/approval-routing/:changeRequestId', authenticateToken, async (req, res) => {
  try {
    const changeRequest = await ChangeRequest.findByPk(req.params.changeRequestId);
    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found'
      });
    }

    // Determine approval routing based on impact level and type
    let approvalRoute = {
      requiresCCB: false,
      requiresSponsor: false,
      requiresSafetyReview: false,
      requiresEngineeringReview: false,
      estimatedReviewTime: '3-5 business days'
    };

    // High impact changes require CCB
    if (changeRequest.impactLevel === 'HIGH' || changeRequest.impactLevel === 'CRITICAL') {
      approvalRoute.requiresCCB = true;
      approvalRoute.estimatedReviewTime = '5-10 business days';
    }

    // Critical changes require sponsor approval
    if (changeRequest.impactLevel === 'CRITICAL' || changeRequest.priority === 'CRITICAL') {
      approvalRoute.requiresSponsor = true;
      approvalRoute.estimatedReviewTime = '7-14 business days';
    }

    // Construction-specific safety reviews
    if (changeRequest.changeType === 'SCOPE' || changeRequest.changeType === 'TECHNICAL') {
      approvalRoute.requiresSafetyReview = true;
    }

    // Structural changes require engineering review
    if (changeRequest.description?.toLowerCase().includes('structural') || 
        changeRequest.description?.toLowerCase().includes('foundation') ||
        changeRequest.description?.toLowerCase().includes('load-bearing')) {
      approvalRoute.requiresEngineeringReview = true;
    }

    res.json({
      success: true,
      data: {
        changeRequest: {
          id: changeRequest.id,
          title: changeRequest.title,
          impactLevel: changeRequest.impactLevel,
          priority: changeRequest.priority,
          changeType: changeRequest.changeType
        },
        approvalRoute
      }
    });
  } catch (error) {
    console.error('Get approval routing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to determine approval routing',
      error: error.message
    });
  }
});

// ========================================
// INTEGRATION DASHBOARD
// ========================================

// Get integration management dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const [charters, changeRequests, closures] = await Promise.all([
      ProjectCharter.count(),
      ChangeRequest.count(),
      ProjectClosure.count()
    ]);

    const pendingApprovals = await ProjectCharter.count({
      where: { approvalStatus: 'PENDING_APPROVAL' }
    });

    const pendingChanges = await ChangeRequest.count({
      where: { currentStatus: 'SUBMITTED' }
    });

    const activeClosures = await ProjectClosure.count({
      where: { closureStatus: { [require('sequelize').Op.in]: ['INITIATED', 'IN_PROGRESS'] } }
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalCharters: charters,
          totalChangeRequests: changeRequests,
          totalClosures: closures,
          pendingApprovals,
          pendingChanges,
          activeClosures
        },
        recentActivity: {
          charters: await ProjectCharter.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{ model: Project, as: 'project', attributes: ['id', 'name'] }]
          }),
          changeRequests: await ChangeRequest.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{ model: Project, as: 'project', attributes: ['id', 'name'] }]
          })
        }
      }
    });
  } catch (error) {
    console.error('Integration dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch integration dashboard data',
      error: error.message
    });
  }
});

// ========================================
// CHANGE REQUEST IMPACT ANALYSIS
// ========================================

// Analyze change request impact across all project components
router.post('/change-request/:id/analyze-impact', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const changeRequest = await ChangeRequest.findByPk(id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status', 'budget', 'endDate'] }
      ]
    });

    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found'
      });
    }

    // Mock impact analysis (replace with real calculations)
    const impactAnalysis = {
      scheduleImpact: {
        estimatedDelay: '5-10 days',
        criticalPathAffected: true,
        dependentTasks: ['Steel Frame Installation', 'Electrical Wiring'],
        mitigationOptions: ['Overtime allocation', 'Resource reallocation', 'Scope reduction']
      },
      costImpact: {
        estimatedAdditionalCost: '$25,000 - $50,000',
        budgetVariance: '+8% to +15%',
        costCategories: {
          materials: '$15,000 - $25,000',
          labor: '$8,000 - $20,000',
          equipment: '$2,000 - $5,000'
        }
      },
      scopeImpact: {
        deliverablesAffected: ['Foundation Design', 'Structural Calculations'],
        qualityStandards: 'May require additional testing',
        riskLevel: 'MEDIUM'
      },
      resourceImpact: {
        additionalResources: ['Structural Engineer', '2 Construction Workers'],
        resourceAvailability: 'Available with 1-week notice',
        skillRequirements: 'Advanced structural analysis skills'
      },
      qualityImpact: {
        qualityStandards: 'Enhanced testing required',
        complianceIssues: 'May need additional permits',
        riskMitigation: 'Additional quality checkpoints'
      }
    };

    res.json({
      success: true,
      data: {
        changeRequest: {
          id: changeRequest.id,
          title: changeRequest.title,
          changeType: changeRequest.changeType,
          priority: changeRequest.priority,
          impactLevel: changeRequest.impactLevel
        },
        project: changeRequest.project,
        impactAnalysis,
        recommendations: [
          'Conduct detailed structural analysis before approval',
          'Update project schedule and budget',
          'Notify all stakeholders of potential impacts',
          'Prepare contingency plans for worst-case scenarios'
        ]
      }
    });
  } catch (error) {
    console.error('Change request impact analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze change request impact',
      error: error.message
    });
  }
});

// ========================================
// PROJECT LIFECYCLE INTEGRATION
// ========================================

// Get integrated project lifecycle view
router.get('/project/:id/lifecycle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await Project.findByPk(id, {
      include: [
        { model: ProjectCharter, as: 'charter' },
        { model: ProjectClosure, as: 'closure' },
        { model: ChangeRequest, as: 'changeRequests' }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Determine project phase
    let currentPhase = 'EXECUTION';
    let phaseProgress = 0;
    
    if (project.charter && project.charter.approvalStatus === 'APPROVED') {
      phaseProgress += 25;
    }
    
    if (project.status === 'IN_PROGRESS') {
      phaseProgress += 50;
    }
    
    if (project.closure && project.closure.closureStatus === 'COMPLETED') {
      phaseProgress += 25;
      currentPhase = 'CLOSURE';
    }

    const lifecycleData = {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate
      },
      phases: {
        initiation: {
          status: project.charter ? 'COMPLETED' : 'NOT_STARTED',
          charter: project.charter,
          progress: project.charter ? 100 : 0
        },
        planning: {
          status: project.charter?.approvalStatus === 'APPROVED' ? 'COMPLETED' : 'IN_PROGRESS',
          progress: project.charter?.approvalStatus === 'APPROVED' ? 100 : 50
        },
        execution: {
          status: project.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'NOT_STARTED',
          progress: project.status === 'IN_PROGRESS' ? 75 : 0
        },
        monitoring: {
          status: project.status === 'IN_PROGRESS' ? 'ACTIVE' : 'NOT_STARTED',
          progress: project.status === 'IN_PROGRESS' ? 50 : 0
        },
        closure: {
          status: project.closure ? 'IN_PROGRESS' : 'NOT_STARTED',
          closure: project.closure,
          progress: project.closure ? 75 : 0
        }
      },
      currentPhase,
      overallProgress: phaseProgress,
      changeRequests: project.changeRequests?.length || 0,
      handoffs: [
        {
          from: 'Project Sponsor',
          to: 'Project Manager',
          status: 'COMPLETED',
          date: project.charter?.createdAt
        },
        {
          from: 'Project Manager',
          to: 'Construction Team',
          status: project.status === 'IN_PROGRESS' ? 'COMPLETED' : 'PENDING',
          date: project.startDate
        },
        {
          from: 'Construction Team',
          to: 'Quality Assurance',
          status: 'PENDING',
          date: null
        }
      ]
    };

    res.json({
      success: true,
      data: lifecycleData
    });
  } catch (error) {
    console.error('Project lifecycle integration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project lifecycle data',
      error: error.message
    });
  }
});

// ========================================
// CROSS-ENTITY RELATIONSHIP VIEWS
// ========================================

// Get integrated project overview showing all interconnected components
router.get('/project/:id/overview', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock integrated project data (replace with real database queries)
    const integratedOverview = {
      project: {
        id: id,
        name: 'Office Building Construction',
        status: 'IN_PROGRESS',
        health: 'GOOD',
        overallProgress: 65
      },
      components: {
        tasks: {
          total: 24,
          completed: 16,
          inProgress: 6,
          notStarted: 2,
          criticalPath: ['Foundation', 'Steel Frame', 'Electrical', 'Finishing'],
          dependencies: [
            { from: 'Foundation', to: 'Steel Frame', type: 'FINISH_TO_START' },
            { from: 'Steel Frame', to: 'Electrical', type: 'FINISH_TO_START' },
            { from: 'Electrical', to: 'Finishing', type: 'FINISH_TO_START' }
          ]
        },
        resources: {
          allocated: 18,
          available: 5,
          utilization: 78,
          criticalResources: ['Structural Engineer', 'Crane Operator'],
          resourceConflicts: [
            { resource: 'Crane', conflict: 'Scheduled for two tasks simultaneously', resolution: 'Reschedule Steel Frame installation' }
          ]
        },
        costs: {
          budgeted: 500000,
          spent: 325000,
          remaining: 175000,
          variance: -25000,
          variancePercentage: -5,
          costTrends: {
            materials: 'On track',
            labor: '5% over budget',
            equipment: 'Under budget'
          }
        },
        risks: {
          total: 8,
          high: 2,
          medium: 4,
          low: 2,
          topRisks: [
            { title: 'Material Supply Delay', probability: 'HIGH', impact: 'MEDIUM', status: 'ACTIVE' },
            { title: 'Weather Conditions', probability: 'MEDIUM', impact: 'HIGH', status: 'MONITORING' }
          ]
        },
        quality: {
          overallScore: 87,
          inspections: 12,
          passed: 11,
          failed: 1,
          qualityTrends: 'Improving',
          criticalIssues: ['Foundation settlement - requires additional testing']
        }
      },
      integrationMetrics: {
        schedulePerformance: 0.92,
        costPerformance: 0.95,
        qualityPerformance: 0.87,
        resourceEfficiency: 0.78,
        riskExposure: 'MEDIUM',
        overallHealth: 'GOOD'
      },
      dependencies: {
        internal: [
          { from: 'Foundation', to: 'Steel Frame', type: 'Technical' },
          { from: 'Steel Frame', to: 'Electrical', type: 'Physical' },
          { from: 'Electrical', to: 'Finishing', type: 'Logical' }
        ],
        external: [
          { from: 'Material Supplier', to: 'Steel Frame', type: 'Supply Chain' },
          { from: 'Permit Office', to: 'Foundation', type: 'Regulatory' },
          { from: 'Weather', to: 'All Outdoor Tasks', type: 'Environmental' }
        ]
      },
      recommendations: [
        'Monitor material supply closely - consider alternative suppliers',
        'Accelerate foundation work to maintain schedule',
        'Increase quality inspections for structural elements',
        'Prepare contingency plan for weather delays'
      ]
    };

    res.json({
      success: true,
      data: integratedOverview
    });
  } catch (error) {
    console.error('Project overview integration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch integrated project overview',
      error: error.message
    });
  }
});

// ========================================
// WORKFLOW ORCHESTRATION
// ========================================

// Get workflow status and dependencies for a project
router.get('/project/:id/workflow', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock workflow data (replace with real database queries)
    const workflowData = {
      projectId: id,
      currentWorkflow: 'EXECUTION_PHASE',
      workflows: [
        {
          name: 'Project Initiation',
          status: 'COMPLETED',
          steps: [
            { name: 'Charter Creation', status: 'COMPLETED', completedBy: 'Project Manager', completedAt: '2024-01-15' },
            { name: 'Stakeholder Approval', status: 'COMPLETED', completedBy: 'Project Sponsor', completedAt: '2024-01-20' },
            { name: 'Team Assembly', status: 'COMPLETED', completedBy: 'HR Manager', completedAt: '2024-01-25' }
          ]
        },
        {
          name: 'Planning Phase',
          status: 'COMPLETED',
          steps: [
            { name: 'Scope Definition', status: 'COMPLETED', completedBy: 'Architect', completedAt: '2024-02-01' },
            { name: 'Schedule Development', status: 'COMPLETED', completedBy: 'Project Manager', completedAt: '2024-02-05' },
            { name: 'Budget Approval', status: 'COMPLETED', completedBy: 'Finance Manager', completedAt: '2024-02-10' }
          ]
        },
        {
          name: 'Execution Phase',
          status: 'IN_PROGRESS',
          steps: [
            { name: 'Foundation Work', status: 'COMPLETED', completedBy: 'Construction Team', completedAt: '2024-03-01' },
            { name: 'Steel Frame Installation', status: 'IN_PROGRESS', assignedTo: 'Steel Team', dueDate: '2024-04-15' },
            { name: 'Electrical Installation', status: 'PENDING', assignedTo: 'Electrical Team', dueDate: '2024-05-01' },
            { name: 'Interior Finishing', status: 'NOT_STARTED', assignedTo: 'Finishing Team', dueDate: '2024-06-01' }
          ]
        },
        {
          name: 'Monitoring & Control',
          status: 'ACTIVE',
          steps: [
            { name: 'Progress Tracking', status: 'ACTIVE', assignedTo: 'Project Manager' },
            { name: 'Quality Control', status: 'ACTIVE', assignedTo: 'Quality Engineer' },
            { name: 'Risk Monitoring', status: 'ACTIVE', assignedTo: 'Risk Manager' }
          ]
        },
        {
          name: 'Project Closure',
          status: 'NOT_STARTED',
          steps: [
            { name: 'Final Inspection', status: 'NOT_STARTED' },
            { name: 'Documentation', status: 'NOT_STARTED' },
            { name: 'Lessons Learned', status: 'NOT_STARTED' },
            { name: 'Team Release', status: 'NOT_STARTED' }
          ]
        }
      ],
      dependencies: [
        {
          from: 'Steel Frame Installation',
          to: 'Electrical Installation',
          type: 'FINISH_TO_START',
          status: 'ACTIVE',
          critical: true
        },
        {
          from: 'Electrical Installation',
          to: 'Interior Finishing',
          type: 'FINISH_TO_START',
          status: 'PENDING',
          critical: true
        }
      ],
      bottlenecks: [
        {
          task: 'Steel Frame Installation',
          issue: 'Material delivery delayed by 3 days',
          impact: 'Schedule delay of 5-7 days',
          resolution: 'Expedited shipping arranged'
        }
      ],
      nextMilestone: {
        name: 'Steel Frame Completion',
        targetDate: '2024-04-15',
        status: 'ON_TRACK',
        dependencies: ['Material delivery', 'Weather conditions']
      }
    };

    res.json({
      success: true,
      data: workflowData
    });
  } catch (error) {
    console.error('Workflow orchestration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow data',
      error: error.message
    });
  }
});

// Approve workflow step and trigger next steps
router.post('/project/:id/workflow/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { workflowName, stepName, comments, nextSteps } = req.body;
    
    // Mock workflow approval (replace with real database updates)
    const approvalResult = {
      projectId: id,
      workflow: workflowName,
      step: stepName,
      status: 'APPROVED',
      approvedBy: req.user.id,
      approvedAt: new Date(),
      comments,
      nextSteps: nextSteps || [],
      impact: {
        schedule: 'On track',
        cost: 'Within budget',
        quality: 'Meets standards',
        risks: 'No new risks identified'
      }
    };

    res.json({
      success: true,
      message: 'Workflow step approved successfully',
      data: approvalResult
    });
  } catch (error) {
    console.error('Workflow approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve workflow step',
      error: error.message
    });
  }
});

module.exports = router; 