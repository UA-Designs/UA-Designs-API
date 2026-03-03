const express = require('express');

const router = express.Router();

const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const materialController = require('../../controllers/Resources/materialController');
const laborController = require('../../controllers/Resources/laborController');
const equipmentController = require('../../controllers/Resources/equipmentController');
const teamController = require('../../controllers/Resources/teamController');
const allocationController = require('../../controllers/Resources/allocationController');

const {
  validateCreateMaterial,
  validateUpdateMaterial,
  validateCreateLabor,
  validateUpdateLabor,
  validateCreateEquipment,
  validateUpdateEquipment,
  validateCreateMaintenance,
  validateCreateTeamMember,
  validateUpdateTeamMember,
  validateAddSkill,
  validateCreateAllocation,
  validateUpdateAllocation
} = require('../../middleware/resourceValidation');

const PM_ADMIN = ['ADMIN', 'PROJECT_MANAGER'];

// --- Health ---
router.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Resource Management' });
});

// --- Material routes ---
router.get('/materials', authenticateToken, materialController.getAll.bind(materialController));
router.get('/materials/:id', authenticateToken, materialController.getById.bind(materialController));
router.post('/materials', authenticateToken, validateCreateMaterial, materialController.create.bind(materialController));
router.put('/materials/:id', authenticateToken, validateUpdateMaterial, materialController.update.bind(materialController));
router.delete('/materials/:id', authenticateToken, authorizeRoles(...PM_ADMIN), materialController.delete.bind(materialController));

// --- Labor routes ---
router.get('/labor', authenticateToken, laborController.getAll.bind(laborController));
router.get('/labor/:id', authenticateToken, laborController.getById.bind(laborController));
router.post('/labor', authenticateToken, validateCreateLabor, laborController.create.bind(laborController));
router.put('/labor/:id', authenticateToken, validateUpdateLabor, laborController.update.bind(laborController));
router.delete('/labor/:id', authenticateToken, authorizeRoles(...PM_ADMIN), laborController.delete.bind(laborController));

// --- Equipment routes ---
router.get('/equipment', authenticateToken, equipmentController.getAll.bind(equipmentController));
router.get('/equipment/:id', authenticateToken, equipmentController.getById.bind(equipmentController));
router.post('/equipment', authenticateToken, validateCreateEquipment, equipmentController.create.bind(equipmentController));
router.put('/equipment/:id', authenticateToken, validateUpdateEquipment, equipmentController.update.bind(equipmentController));
router.delete('/equipment/:id', authenticateToken, authorizeRoles(...PM_ADMIN), equipmentController.delete.bind(equipmentController));
router.post('/equipment/:id/maintenance', authenticateToken, validateCreateMaintenance, equipmentController.addMaintenance.bind(equipmentController));
router.get('/equipment/:id/maintenance', authenticateToken, equipmentController.getMaintenanceHistory.bind(equipmentController));

// --- Team routes ---
router.get('/team', authenticateToken, teamController.getAll.bind(teamController));
router.get('/team/:id', authenticateToken, teamController.getById.bind(teamController));
router.post('/team', authenticateToken, authorizeRoles(...PM_ADMIN), validateCreateTeamMember, teamController.create.bind(teamController));
router.put('/team/:id', authenticateToken, authorizeRoles(...PM_ADMIN), validateUpdateTeamMember, teamController.update.bind(teamController));
router.delete('/team/:id', authenticateToken, authorizeRoles(...PM_ADMIN), teamController.delete.bind(teamController));
router.get('/team/:id/skills', authenticateToken, teamController.getSkills.bind(teamController));
router.post('/team/:id/skills', authenticateToken, authorizeRoles(...PM_ADMIN), validateAddSkill, teamController.addSkill.bind(teamController));

// --- Allocation routes ---
router.get('/allocations', authenticateToken, allocationController.getAll.bind(allocationController));
router.post('/allocations', authenticateToken, authorizeRoles(...PM_ADMIN), validateCreateAllocation, allocationController.create.bind(allocationController));
router.put('/allocations/:id', authenticateToken, authorizeRoles(...PM_ADMIN), validateUpdateAllocation, allocationController.update.bind(allocationController));
router.delete('/allocations/:id', authenticateToken, authorizeRoles(...PM_ADMIN), allocationController.delete.bind(allocationController));
router.get('/conflicts', authenticateToken, allocationController.detectConflicts.bind(allocationController));

// --- Reporting routes ---
router.get('/utilization/:projectId', authenticateToken, allocationController.getUtilization.bind(allocationController));
router.get('/summary/:projectId', authenticateToken, allocationController.getSummary.bind(allocationController));

module.exports = router; 