import React from 'react';
import { Card } from 'antd';

interface Risk {
  id: string;
  name: string;
  probability: number;
  impact: number;
  severity: string;
}

interface RiskMatrixProps {
  risks: Risk[];
}

const RiskMatrix: React.FC<RiskMatrixProps> = ({ risks }) => {
  return (
    <Card title="Risk Matrix" size="small">
      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Risk Matrix - Coming Soon</p>
        <p>Risks: {risks.length}</p>
      </div>
    </Card>
  );
};

export default RiskMatrix; 