import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const dashboardService = {
  getDashboardData: async (selectedProject?: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard`, {
        params: { projectId: selectedProject }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Return mock data for development
      return {
        activeProjects: 5,
        completedProjects: 12,
        totalBudget: 2500000,
        totalCost: 2100000,
        costVariance: [
          { month: 'Jan', planned: 200000, actual: 180000 },
          { month: 'Feb', planned: 220000, actual: 240000 },
          { month: 'Mar', planned: 240000, actual: 230000 }
        ],
        risks: [
          { id: '1', name: 'Material Delay', probability: 0.3, impact: 0.7, severity: 'HIGH' },
          { id: '2', name: 'Weather Issues', probability: 0.2, impact: 0.5, severity: 'MEDIUM' }
        ],
        recentActivities: [
          { id: '1', user: 'John Doe', action: 'Updated Project Schedule', timestamp: '2 hours ago' },
          { id: '2', user: 'Jane Smith', action: 'Added New Task', timestamp: '4 hours ago' }
        ]
      };
    }
  }
}; 