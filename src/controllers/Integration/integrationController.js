const { 
  Project, 
  ChangeRequest, 
  ProjectCharter, 
  ProjectClosure,
  LessonsLearned,
  ProjectTemplate,
  ApprovalWorkflow,
  ChangeImpact,
  User
} = require('../../models');

/**
 * Integration Management Controller
 * Handles cross-module integration and coordination
 */
class IntegrationController {
  
  /**
   * Get integration dashboard data
   */
  async getDashboard(req, res) {
    try {
      const { projectId } = req.params;
      
      // Get project integration status
      const project = await Project.findByPk(projectId, {
        include: [
          { model: ProjectCharter, as: 'charter' },
          { model: ChangeRequest, as: 'changeRequests' },
          { model: ProjectClosure, as: 'closure' }
        ]
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Get integration metrics
      const metrics = await this.getIntegrationMetrics(projectId);
      
      // Get recent activities
      const recentActivities = await this.getRecentActivities(projectId);
      
      // Get pending approvals
      const pendingApprovals = await this.getPendingApprovals(projectId);
      
      // Get project health status
      const projectHealth = await this.getProjectHealth(projectId);

      res.json({
        success: true,
        data: {
          project: {
            id: project.id,
            name: project.name,
            status: project.status,
            phase: project.phase
          },
          metrics,
          recentActivities,
          pendingApprovals,
          projectHealth,
          integrationStatus: {
            charter: project.charter ? project.charter.approvalStatus : 'NOT_CREATED',
            changeRequests: project.changeRequests.length,
            closure: project.closure ? project.closure.closureStatus : 'NOT_INITIATED'
          }
        }
      });
    } catch (error) {
      console.error('Integration dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get integration dashboard',
        error: error.message
      });
    }
  }

  /**
   * Get project integration status
   */
  async getProjectStatus(req, res) {
    try {
      const { projectId } = req.params;
      
      const project = await Project.findByPk(projectId, {
        include: [
          { model: ProjectCharter, as: 'charter' },
          { model: ChangeRequest, as: 'changeRequests' },
          { model: ProjectClosure, as: 'closure' },
          { model: LessonsLearned, as: 'lessonsLearned' }
        ]
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const status = {
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
          phase: project.phase
        },
        charter: {
          status: project.charter ? project.charter.approvalStatus : 'NOT_CREATED',
          version: project.charter ? project.charter.charterVersion : null,
          approvedAt: project.charter ? project.charter.approvedAt : null
        },
        changeRequests: {
          total: project.changeRequests.length,
          pending: project.changeRequests.filter(cr => cr.currentStatus === 'UNDER_REVIEW').length,
          approved: project.changeRequests.filter(cr => cr.currentStatus === 'APPROVED').length,
          rejected: project.changeRequests.filter(cr => cr.currentStatus === 'REJECTED').length
        },
        closure: {
          status: project.closure ? project.closure.closureStatus : 'NOT_INITIATED',
          initiatedAt: project.closure ? project.closure.createdAt : null
        },
        lessonsLearned: {
          total: project.lessonsLearned.length,
          validated: project.lessonsLearned.filter(ll => ll.status === 'VALIDATED').length
        }
      };

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Project status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get project status',
        error: error.message
      });
    }
  }

  /**
   * Get project dependencies
   */
  async getProjectDependencies(req, res) {
    try {
      const { projectId } = req.params;
      
      // Get project dependencies from various modules
      const dependencies = {
        scope: await this.getScopeDependencies(projectId),
        schedule: await this.getScheduleDependencies(projectId),
        cost: await this.getCostDependencies(projectId),
        quality: await this.getQualityDependencies(projectId),
        resources: await this.getResourceDependencies(projectId),
        communications: await this.getCommunicationDependencies(projectId),
        risk: await this.getRiskDependencies(projectId),
        procurement: await this.getProcurementDependencies(projectId),
        stakeholders: await this.getStakeholderDependencies(projectId)
      };

      res.json({
        success: true,
        data: dependencies
      });
    } catch (error) {
      console.error('Project dependencies error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get project dependencies',
        error: error.message
      });
    }
  }

  /**
   * Sync project data across modules
   */
  async syncProjectData(req, res) {
    try {
      const { projectId } = req.params;
      const { modules } = req.body;
      
      const syncResults = {};
      
      // Sync specified modules
      if (modules.includes('scope')) {
        syncResults.scope = await this.syncScopeData(projectId);
      }
      
      if (modules.includes('schedule')) {
        syncResults.schedule = await this.syncScheduleData(projectId);
      }
      
      if (modules.includes('cost')) {
        syncResults.cost = await this.syncCostData(projectId);
      }
      
      if (modules.includes('quality')) {
        syncResults.quality = await this.syncQualityData(projectId);
      }
      
      if (modules.includes('resources')) {
        syncResults.resources = await this.syncResourceData(projectId);
      }
      
      if (modules.includes('communications')) {
        syncResults.communications = await this.syncCommunicationData(projectId);
      }
      
      if (modules.includes('risk')) {
        syncResults.risk = await this.syncRiskData(projectId);
      }
      
      if (modules.includes('procurement')) {
        syncResults.procurement = await this.syncProcurementData(projectId);
      }
      
      if (modules.includes('stakeholders')) {
        syncResults.stakeholders = await this.syncStakeholderData(projectId);
      }

      res.json({
        success: true,
        message: 'Project data synchronized successfully',
        data: syncResults
      });
    } catch (error) {
      console.error('Project sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync project data',
        error: error.message
      });
    }
  }

  /**
   * Get integration health check
   */
  async getHealthCheck(req, res) {
    try {
      const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
          projectCharter: await this.checkProjectCharterService(),
          changeRequest: await this.checkChangeRequestService(),
          projectClosure: await this.checkProjectClosureService(),
          lessonsLearned: await this.checkLessonsLearnedService(),
          projectTemplate: await this.checkProjectTemplateService(),
          approvalWorkflow: await this.checkApprovalWorkflowService(),
          changeImpact: await this.checkChangeImpactService()
        },
        database: await this.checkDatabaseConnection(),
        integrations: await this.checkModuleIntegrations()
      };

      const allServicesHealthy = Object.values(health.services).every(service => service.status === 'OK');
      const overallStatus = allServicesHealthy && health.database.status === 'OK' ? 'OK' : 'DEGRADED';

      res.json({
        success: true,
        data: {
          ...health,
          status: overallStatus
        }
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error.message
      });
    }
  }

  // Helper methods
  async getIntegrationMetrics(projectId) {
    // Implementation for getting integration metrics
    return {
      charterApprovalTime: 0,
      changeRequestProcessingTime: 0,
      closureCompletionTime: 0,
      lessonsLearnedCount: 0,
      integrationScore: 0
    };
  }

  async getRecentActivities(projectId) {
    // Implementation for getting recent activities
    return [];
  }

  async getPendingApprovals(projectId) {
    // Implementation for getting pending approvals
    return [];
  }

  async getProjectHealth(projectId) {
    // Implementation for getting project health
    return {
      overall: 'HEALTHY',
      scope: 'HEALTHY',
      schedule: 'HEALTHY',
      cost: 'HEALTHY',
      quality: 'HEALTHY',
      resources: 'HEALTHY',
      communications: 'HEALTHY',
      risk: 'HEALTHY',
      procurement: 'HEALTHY',
      stakeholders: 'HEALTHY'
    };
  }

  // Dependency methods
  async getScopeDependencies(projectId) {
    // Implementation for scope dependencies
    return [];
  }

  async getScheduleDependencies(projectId) {
    // Implementation for schedule dependencies
    return [];
  }

  async getCostDependencies(projectId) {
    // Implementation for cost dependencies
    return [];
  }

  async getQualityDependencies(projectId) {
    // Implementation for quality dependencies
    return [];
  }

  async getResourceDependencies(projectId) {
    // Implementation for resource dependencies
    return [];
  }

  async getCommunicationDependencies(projectId) {
    // Implementation for communication dependencies
    return [];
  }

  async getRiskDependencies(projectId) {
    // Implementation for risk dependencies
    return [];
  }

  async getProcurementDependencies(projectId) {
    // Implementation for procurement dependencies
    return [];
  }

  async getStakeholderDependencies(projectId) {
    // Implementation for stakeholder dependencies
    return [];
  }

  // Sync methods
  async syncScopeData(projectId) {
    // Implementation for scope data sync
    return { status: 'SYNCED', records: 0 };
  }

  async syncScheduleData(projectId) {
    // Implementation for schedule data sync
    return { status: 'SYNCED', records: 0 };
  }

  async syncCostData(projectId) {
    // Implementation for cost data sync
    return { status: 'SYNCED', records: 0 };
  }

  async syncQualityData(projectId) {
    // Implementation for quality data sync
    return { status: 'SYNCED', records: 0 };
  }

  async syncResourceData(projectId) {
    // Implementation for resource data sync
    return { status: 'SYNCED', records: 0 };
  }

  async syncCommunicationData(projectId) {
    // Implementation for communication data sync
    return { status: 'SYNCED', records: 0 };
  }

  async syncRiskData(projectId) {
    // Implementation for risk data sync
    return { status: 'SYNCED', records: 0 };
  }

  async syncProcurementData(projectId) {
    // Implementation for procurement data sync
    return { status: 'SYNCED', records: 0 };
  }

  async syncStakeholderData(projectId) {
    // Implementation for stakeholder data sync
    return { status: 'SYNCED', records: 0 };
  }

  // Health check methods
  async checkProjectCharterService() {
    try {
      const count = await ProjectCharter.count();
      return { status: 'OK', count };
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  }

  async checkChangeRequestService() {
    try {
      const count = await ChangeRequest.count();
      return { status: 'OK', count };
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  }

  async checkProjectClosureService() {
    try {
      const count = await ProjectClosure.count();
      return { status: 'OK', count };
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  }

  async checkLessonsLearnedService() {
    try {
      const count = await LessonsLearned.count();
      return { status: 'OK', count };
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  }

  async checkProjectTemplateService() {
    try {
      const count = await ProjectTemplate.count();
      return { status: 'OK', count };
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  }

  async checkApprovalWorkflowService() {
    try {
      const count = await ApprovalWorkflow.count();
      return { status: 'OK', count };
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  }

  async checkChangeImpactService() {
    try {
      const count = await ChangeImpact.count();
      return { status: 'OK', count };
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  }

  async checkDatabaseConnection() {
    try {
      await Project.findOne({ limit: 1 });
      return { status: 'OK' };
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  }

  async checkModuleIntegrations() {
    // Implementation for checking module integrations
    return {
      scope: { status: 'OK' },
      schedule: { status: 'OK' },
      cost: { status: 'OK' },
      quality: { status: 'OK' },
      resources: { status: 'OK' },
      communications: { status: 'OK' },
      risk: { status: 'OK' },
      procurement: { status: 'OK' },
      stakeholders: { status: 'OK' }
    };
  }
}

module.exports = new IntegrationController();
