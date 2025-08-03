import React from 'react';
import { Card } from 'antd';

interface CostVarianceData {
  month: string;
  planned: number;
  actual: number;
}

interface CostVarianceChartProps {
  data: CostVarianceData[];
}

const CostVarianceChart: React.FC<CostVarianceChartProps> = ({ data }) => {
  return (
    <Card title="Cost Variance Analysis" size="small">
      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Cost Variance Chart - Coming Soon</p>
        <p>Data Points: {data.length}</p>
      </div>
    </Card>
  );
};

export default CostVarianceChart; 