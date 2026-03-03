const teamService = require('../../services/Resources/teamService');

class TeamController {
  async getAll(req, res) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        projectId: req.query.projectId,
        status: req.query.status,
        search: req.query.search,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await teamService.getAll(filters);

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
      console.error('TeamController.getAll error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch team members',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getById(req, res) {
    try {
      const member = await teamService.getById(req.params.id);

      if (!member) {
        return res.status(404).json({ success: false, message: 'Team member not found' });
      }

      res.json({ success: true, data: member });
    } catch (error) {
      console.error('TeamController.getById error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch team member',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async create(req, res) {
    try {
      const member = await teamService.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Team member assigned successfully',
        data: member
      });
    } catch (error) {
      console.error('TeamController.create error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign team member',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async update(req, res) {
    try {
      const member = await teamService.update(req.params.id, req.body);

      if (!member) {
        return res.status(404).json({ success: false, message: 'Team member not found' });
      }

      res.json({
        success: true,
        message: 'Team member updated successfully',
        data: member
      });
    } catch (error) {
      console.error('TeamController.update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update team member',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async delete(req, res) {
    try {
      const result = await teamService.delete(req.params.id);

      if (!result) {
        return res.status(404).json({ success: false, message: 'Team member not found' });
      }

      res.json({ success: true, message: 'Team member removed successfully' });
    } catch (error) {
      console.error('TeamController.delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove team member',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getSkills(req, res) {
    try {
      const skills = await teamService.getSkills(req.params.id);

      if (!skills) {
        return res.status(404).json({ success: false, message: 'Team member not found' });
      }

      res.json({ success: true, data: skills });
    } catch (error) {
      console.error('TeamController.getSkills error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch skills',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async addSkill(req, res) {
    try {
      const skill = await teamService.addSkill(req.params.id, req.body);

      if (!skill) {
        return res.status(404).json({ success: false, message: 'Team member not found' });
      }

      res.status(201).json({
        success: true,
        message: 'Skill added successfully',
        data: skill
      });
    } catch (error) {
      console.error('TeamController.addSkill error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add skill',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new TeamController();
