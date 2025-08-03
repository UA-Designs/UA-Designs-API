import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Progress, Table, Button, Space, Tag, Typography } from 'antd';
import { 
  ProjectOutlined, 
  TeamOutlined, 
  DollarOutlined, 
  ClockCircleOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useQuery } from 'react-query';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

// Components
import ProjectGanttChart from '../../components/Charts/ProjectGanttChart';
import CostVarianceChart from '../../components/Charts/CostVarianceChart';
import RiskMatrix from '../../components/Charts/RiskMatrix';
import RecentActivities from '../../components/Dashboard/RecentActivities';
import QuickActions from '../../components/Dashboard/QuickActions';

// Services
import { dashboardService } from '../../services/dashboardService';
import { projectService } from '../../services/projectService';

// Types
import { Project, Task, User } from '../../types';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery(
    ['dashboard', selectedProject],
    () => dashboardService.getDashboardData(selectedProject),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Fetch active projects
  const { data: activeProjects } = useQuery(
    ['activeProjects'],
    () => projectService.getActiveProjects(),
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );

  const handleProjectSelect = (projectId: string) => {
    setSelectedProject(projectId);
  };

  const handleNavigateToPMBOK = (knowledgeArea: string) => {
    navigate(`/${knowledgeArea}`);
  };

  // PMBOK Knowledge Areas Cards
  const pmbokCards = [
    {
      title: 'Project Integration',
      icon: <ProjectOutlined />,
      color: '#1890ff',
      path: 'integration',
      description: 'Unified project management'
    },
    {
      title: 'Project Scope',
      icon: <FileTextOutlined />,
      color: '#52c41a',
      path: 'scope',
      description: 'Scope definition and control'
    },
    {
      title: 'Project Schedule',
      icon: <ClockCircleOutlined />,
      color: '#faad14',
      path: 'schedule',
      description: 'Scheduling and timeline management'
    },
    {
      title: 'Project Cost',
      icon: <DollarOutlined />,
      color: '#f5222d',
      path: 'cost',
      description: 'Budget and cost tracking'
    },
    {
      title: 'Project Quality',
      icon: <CheckCircleOutlined />,
      color: '#722ed1',
      path: 'quality',
      description: 'Quality control and assurance'
    },
    {
      title: 'Project Resources',
      icon: <TeamOutlined />,
      color: '#13c2c2',
      path: 'resources',
      description: 'Resource allocation and management'
    },
    {
      title: 'Project Communications',
      icon: <UserOutlined />,
      color: '#eb2f96',
      path: 'communications',
      description: 'Stakeholder communication'
    },
    {
      title: 'Project Risk',
      icon: <AlertOutlined />,
      color: '#fa8c16',
      path: 'risk',
      description: 'Risk assessment and mitigation'
    },
    {
      title: 'Project Procurement',
      icon: <BarChartOutlined />,
      color: '#a0d911',
      path: 'procurement',
      description: 'Procurement management'
    },
    {
      title: 'Project Stakeholders',
      icon: <UserOutlined />,
      color: '#722ed1',
      path: 'stakeholders',
      description: 'Stakeholder management'
    }
  ];

  // Project status columns
  const projectColumns = [
    {
      title: 'Project',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Project) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary">{record.projectNumber}</Text>
        </div>
      ),
    },
    {
      title: 'Client',
      dataIndex: 'clientName',
      key: 'clientName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          PROPOSAL: { color: 'blue', text: 'Proposal' },
          CONSTRUCTION: { color: 'green', text: 'Construction' },
          INSPECTION: { color: 'orange', text: 'Inspection' },
          COMPLETION: { color: 'purple', text: 'Completion' },
          ON_HOLD: { color: 'red', text: 'On Hold' },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => <Progress percent={progress} size="small" />,
    },
    {
      title: 'Budget',
      dataIndex: 'budget',
      key: 'budget',
      render: (budget: number, record: Project) => (
        <div>
          <Text>${budget.toLocaleString()}</Text>
          <br />
          <Text type="secondary">
            {record.actualCost > budget ? (
              <Text type="danger">+${(record.actualCost - budget).toLocaleString()}</Text>
            ) : (
              <Text type="success">-${(budget - record.actualCost).toLocaleString()}</Text>
            )}
          </Text>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Project) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/schedule?project=${record.id}`)}>
            View
          </Button>
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <Title level={2}>UA Designs Project Management Dashboard</Title>
      
      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Projects"
              value={dashboardData?.activeProjects || 0}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Team Members"
              value={dashboardData?.teamMembers || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Budget"
              value={dashboardData?.totalBudget || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#faad14' }}
              formatter={(value) => `$${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Overdue Tasks"
              value={dashboardData?.overdueTasks || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* PMBOK Knowledge Areas */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Title level={3}>PMBOK Knowledge Areas</Title>
        </Col>
        {pmbokCards.map((card) => (
          <Col xs={24} sm={12} lg={8} xl={6} key={card.path}>
            <Card
              hoverable
              onClick={() => handleNavigateToPMBOK(card.path)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: card.color, marginBottom: 8 }}>
                  {card.icon}
                </div>
                <Title level={4} style={{ margin: 0 }}>
                  {card.title}
                </Title>
                <Text type="secondary">{card.description}</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Project Overview and Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Project Schedule Overview" size="small">
            <ProjectGanttChart projects={activeProjects || []} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Cost Variance Analysis" size="small">
            <CostVarianceChart data={dashboardData?.costVariance || []} />
          </Card>
        </Col>
      </Row>

      {/* Risk Matrix and Recent Activities */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Risk Matrix" size="small">
            <RiskMatrix risks={dashboardData?.risks || []} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Recent Activities" size="small">
            <RecentActivities activities={dashboardData?.recentActivities || []} />
          </Card>
        </Col>
      </Row>

      {/* Active Projects Table */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Active Projects" extra={<Button type="primary">View All</Button>}>
            <Table
              columns={projectColumns}
              dataSource={activeProjects || []}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <QuickActions />
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 