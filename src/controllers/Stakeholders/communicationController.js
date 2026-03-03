const communicationService = require('../../services/Stakeholders/communicationService');

class CommunicationController {
  async getAll(req, res) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        stakeholderId: req.query.stakeholderId,
        projectId: req.query.projectId,
        type: req.query.type,
        status: req.query.status,
        direction: req.query.direction,
        search: req.query.search,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await communicationService.getAll(filters);

      res.json({
        success: true,
        data: result.items,
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalItems: result.total,
          hasNext: result.page < result.totalPages,
          hasPrev: result.page > 1
        }
      });
    } catch (error) {
      console.error('CommunicationController.getAll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch communications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getCommunicationsByStakeholder(req, res) {
    try {
      const comms = await communicationService.getCommunicationsByStakeholder(req.params.id);

      res.json({ success: true, data: comms });
    } catch (error) {
      console.error('CommunicationController.getCommunicationsByStakeholder error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch communications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async create(req, res) {
    try {
      const comm = await communicationService.create(req.params.id, {
        ...req.body,
        sentBy: req.body.sentBy || req.user.id
      });

      if (!comm) {
        return res.status(404).json({
          success: false,
          message: 'Stakeholder not found'
        });
      }

      res.status(201).json({
        success: true,
        message: 'Communication logged successfully',
        data: comm
      });
    } catch (error) {
      console.error('CommunicationController.create error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create communication',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async update(req, res) {
    try {
      const comm = await communicationService.update(req.params.commId, req.body);

      if (!comm) {
        return res.status(404).json({
          success: false,
          message: 'Communication not found'
        });
      }

      res.json({
        success: true,
        message: 'Communication updated successfully',
        data: comm
      });
    } catch (error) {
      console.error('CommunicationController.update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update communication',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async delete(req, res) {
    try {
      const result = await communicationService.delete(req.params.commId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Communication not found'
        });
      }

      res.json({
        success: true,
        message: 'Communication deleted successfully'
      });
    } catch (error) {
      console.error('CommunicationController.delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete communication',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getEngagementHistory(req, res) {
    try {
      const history = await communicationService.getEngagementHistory(req.params.id);

      res.json({ success: true, data: history });
    } catch (error) {
      console.error('CommunicationController.getEngagementHistory error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch engagement history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async recordEngagement(req, res) {
    try {
      const engagement = await communicationService.recordEngagement(req.params.id, {
        ...req.body,
        assessedBy: req.body.assessedBy || req.user.id
      });

      if (!engagement) {
        return res.status(404).json({
          success: false,
          message: 'Stakeholder not found'
        });
      }

      res.status(201).json({
        success: true,
        message: 'Engagement recorded successfully',
        data: engagement
      });
    } catch (error) {
      console.error('CommunicationController.recordEngagement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record engagement',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async submitFeedback(req, res) {
    try {
      const engagement = await communicationService.submitFeedback(req.params.id, {
        ...req.body,
        assessedBy: req.body.assessedBy || req.user.id
      });

      if (!engagement) {
        return res.status(404).json({
          success: false,
          message: 'Stakeholder not found'
        });
      }

      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: engagement
      });
    } catch (error) {
      console.error('CommunicationController.submitFeedback error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit feedback',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new CommunicationController();
