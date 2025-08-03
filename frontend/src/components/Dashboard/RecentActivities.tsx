import React from 'react';
import { List, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

interface Activity {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

interface RecentActivitiesProps {
  activities: Activity[];
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({ activities }) => {
  return (
    <List
      size="small"
      dataSource={activities}
      renderItem={(item) => (
        <List.Item>
          <List.Item.Meta
            avatar={<Avatar icon={<UserOutlined />} />}
            title={item.action}
            description={`${item.user} - ${item.timestamp}`}
          />
        </List.Item>
      )}
    />
  );
};

export default RecentActivities; 