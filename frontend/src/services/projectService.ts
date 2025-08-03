import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const projectService = {
  getActiveProjects: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/active`);
      return response.data;
    } catch (error) {
      console.error('Error fetching active projects:', error);
      // Return mock data for development
      return [
        {
          id: '1',
          name: 'Residential Complex A',
          projectNumber: 'UA-2024001',
          status: 'IN_PROGRESS',
          progress: 65,
          startDate: '2024-01-15',
          endDate: '2024-08-30'
        },
        {
          id: '2',
          name: 'Commercial Building B',
          projectNumber: 'UA-2024002',
          status: 'PLANNING',
          progress: 25,
          startDate: '2024-03-01',
          endDate: '2024-12-15'
        }
      ];
    }
  }
}; 