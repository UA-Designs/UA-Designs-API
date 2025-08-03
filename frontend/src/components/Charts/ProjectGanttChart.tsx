import React from 'react';
import { Card } from 'antd';

interface Project {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
}

interface ProjectGanttChartProps {
  projects: Project[];
}

const ProjectGanttChart: React.FC<ProjectGanttChartProps> = ({ projects }) => {
  return (
    <Card title="Project Timeline" size="small">
      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Gantt Chart Component - Coming Soon</p>
        <p>Projects: {projects.length}</p>
      </div>
    </Card>
  );
};

export default ProjectGanttChart; 