const { Op } = require('sequelize');

const { ResourceAllocation, Project, Task, Material, Labor, Equipment, TeamMember } = require('../../models');

class AllocationService {
  async getAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      projectId,
      taskId,
      resourceType,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    const where = {};
    if (projectId) where.projectId = projectId;
    if (taskId) where.taskId = taskId;
    if (resourceType) where.resourceType = resourceType;
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await ResourceAllocation.findAndCountAll({
      where,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'name', 'status'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      distinct: true
    });

    return {
      items: result.rows,
      total: result.count,
      page: parseInt(page),
      totalPages: Math.ceil(result.count / parseInt(limit))
    };
  }

  async create(data) {
    return ResourceAllocation.create(data);
  }

  async update(id, data) {
    const allocation = await ResourceAllocation.findByPk(id);
    if (!allocation) return null;
    await allocation.update(data);
    return allocation.reload();
  }

  async delete(id) {
    const allocation = await ResourceAllocation.findByPk(id);
    if (!allocation) return null;
    await allocation.destroy();
    return true;
  }

  async detectConflicts(projectId) {
    const allocations = await ResourceAllocation.findAll({
      where: {
        projectId,
        status: { [Op.in]: ['PLANNED', 'ALLOCATED', 'IN_USE'] },
        startDate: { [Op.ne]: null },
        endDate: { [Op.ne]: null }
      },
      order: [['resourceType', 'ASC'], ['resourceId', 'ASC'], ['startDate', 'ASC']]
    });

    const conflicts = [];

    // Group allocations by resourceType + resourceId
    const grouped = {};
    for (const alloc of allocations) {
      const key = `${alloc.resourceType}:${alloc.resourceId}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(alloc);
    }

    // Detect overlapping date ranges within each resource group
    for (const [key, group] of Object.entries(grouped)) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];
          const aStart = new Date(a.startDate);
          const aEnd = new Date(a.endDate);
          const bStart = new Date(b.startDate);
          const bEnd = new Date(b.endDate);

          if (aStart <= bEnd && aEnd >= bStart) {
            conflicts.push({
              resourceType: a.resourceType,
              resourceId: a.resourceId,
              conflict: 'DATE_OVERLAP',
              allocations: [
                { id: a.id, taskId: a.taskId, startDate: a.startDate, endDate: a.endDate, quantity: a.quantity },
                { id: b.id, taskId: b.taskId, startDate: b.startDate, endDate: b.endDate, quantity: b.quantity }
              ]
            });
          }
        }
      }
    }

    return conflicts;
  }

  async getSummary(projectId) {
    const { Material, Labor, Equipment, TeamMember, ResourceAllocation } = require('../../models');

    const [
      materialCount,
      laborCount,
      equipmentCount,
      teamCount,
      allocationCount,
      activeMaterials,
      activeLabor,
      activeEquipment
    ] = await Promise.all([
      Material.count({ where: { projectId } }),
      Labor.count({ where: { projectId } }),
      Equipment.count({ where: { projectId } }),
      TeamMember.count({ where: { projectId } }),
      ResourceAllocation.count({ where: { projectId } }),
      Material.count({ where: { projectId, status: { [Op.in]: ['IN_USE'] } } }),
      Labor.count({ where: { projectId, status: 'ASSIGNED' } }),
      Equipment.count({ where: { projectId, status: 'IN_USE' } })
    ]);

    return {
      projectId,
      totals: {
        materials: materialCount,
        labor: laborCount,
        equipment: equipmentCount,
        teamMembers: teamCount,
        allocations: allocationCount
      },
      active: {
        materials: activeMaterials,
        labor: activeLabor,
        equipment: activeEquipment
      }
    };
  }

  async getUtilization(projectId) {
    const { Material, Labor, Equipment } = require('../../models');

    const [materials, labor, equipment] = await Promise.all([
      Material.findAll({ where: { projectId } }),
      Labor.findAll({ where: { projectId } }),
      Equipment.findAll({ where: { projectId } })
    ]);

    // Material utilization: quantity in use / total ordered
    const materialUtil = materials.reduce((acc, m) => {
      acc.totalQuantity += parseFloat(m.quantity) || 0;
      acc.totalCost += parseFloat(m.totalCost) || 0;
      acc.inUseCount += m.status === 'IN_USE' ? 1 : 0;
      acc.depletedCount += m.status === 'DEPLETED' ? 1 : 0;
      return acc;
    }, { totalQuantity: 0, totalCost: 0, inUseCount: 0, depletedCount: 0, total: materials.length });

    // Labor utilization: total hours worked and cost
    const laborUtil = labor.reduce((acc, l) => {
      acc.totalHoursWorked += parseFloat(l.hoursWorked) || 0;
      acc.totalCost += parseFloat(l.totalCost) || 0;
      acc.assignedCount += l.status === 'ASSIGNED' ? 1 : 0;
      return acc;
    }, { totalHoursWorked: 0, totalCost: 0, assignedCount: 0, total: labor.length });

    // Equipment utilization
    const equipUtil = equipment.reduce((acc, e) => {
      acc.inUseCount += e.status === 'IN_USE' ? 1 : 0;
      acc.maintenanceCount += e.status === 'MAINTENANCE' ? 1 : 0;
      acc.availableCount += e.status === 'AVAILABLE' ? 1 : 0;
      return acc;
    }, { inUseCount: 0, maintenanceCount: 0, availableCount: 0, total: equipment.length });

    equipUtil.utilizationRate = equipUtil.total > 0
      ? parseFloat((equipUtil.inUseCount / equipUtil.total).toFixed(4))
      : 0;

    return {
      projectId,
      materials: materialUtil,
      labor: laborUtil,
      equipment: equipUtil
    };
  }
}

module.exports = new AllocationService();
