import React from 'react';
import { Card, Button, Space } from 'antd';
import { PlusOutlined, FileTextOutlined, TeamOutlined, SettingOutlined } from '@ant-design/icons';

const QuickActions: React.FC = () => {
  return (
    <Card title="Quick Actions" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button type="primary" icon={<PlusOutlined />} block>
          New Project
        </Button>
        <Button icon={<FileTextOutlined />} block>
          Generate Report
        </Button>
        <Button icon={<TeamOutlined />} block>
          Manage Team
        </Button>
        <Button icon={<SettingOutlined />} block>
          Settings
        </Button>
      </Space>
    </Card>
  );
};

export default QuickActions; 