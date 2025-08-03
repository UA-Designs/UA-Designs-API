import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ConfigProvider } from 'antd';
import { Toaster } from 'react-hot-toast';

// Layout Components
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';

// PMBOK Knowledge Areas Pages
import ProjectIntegration from './pages/PMBOK/Integration/ProjectIntegration';
import ProjectScope from './pages/PMBOK/Scope/ProjectScope';
import ProjectSchedule from './pages/PMBOK/Schedule/ProjectSchedule';
import ProjectCost from './pages/PMBOK/Cost/ProjectCost';
import ProjectQuality from './pages/PMBOK/Quality/ProjectQuality';
import ProjectResources from './pages/PMBOK/Resources/ProjectResources';
import ProjectCommunications from './pages/PMBOK/Communications/ProjectCommunications';
import ProjectRisk from './pages/PMBOK/Risk/ProjectRisk';
import ProjectProcurement from './pages/PMBOK/Procurement/ProjectProcurement';
import ProjectStakeholders from './pages/PMBOK/Stakeholders/ProjectStakeholders';

// Authentication
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';

// User Management
import Users from './pages/Users/Users';
import Profile from './pages/Profile/Profile';

// Reports and Analytics
import Reports from './pages/Reports/Reports';
import Analytics from './pages/Analytics/Analytics';

// Settings
import Settings from './pages/Settings/Settings';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Styles
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1890ff',
            colorSuccess: '#52c41a',
            colorWarning: '#faad14',
            colorError: '#ff4d4f',
            colorInfo: '#1890ff',
            borderRadius: 6,
          },
        }}
      >
        <AuthProvider>
          <ProjectProvider>
            <NotificationProvider>
              <Router>
                <div className="app">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />

                    {/* Protected Routes */}
                    <Route path="/" element={<Layout />}>
                      <Route index element={<Dashboard />} />
                      
                      {/* PMBOK Knowledge Areas */}
                      <Route path="integration" element={<ProjectIntegration />} />
                      <Route path="scope" element={<ProjectScope />} />
                      <Route path="schedule" element={<ProjectSchedule />} />
                      <Route path="cost" element={<ProjectCost />} />
                      <Route path="quality" element={<ProjectQuality />} />
                      <Route path="resources" element={<ProjectResources />} />
                      <Route path="communications" element={<ProjectCommunications />} />
                      <Route path="risk" element={<ProjectRisk />} />
                      <Route path="procurement" element={<ProjectProcurement />} />
                      <Route path="stakeholders" element={<ProjectStakeholders />} />

                      {/* User Management */}
                      <Route path="users" element={<Users />} />
                      <Route path="profile" element={<Profile />} />

                      {/* Reports and Analytics */}
                      <Route path="reports" element={<Reports />} />
                      <Route path="analytics" element={<Analytics />} />

                      {/* Settings */}
                      <Route path="settings" element={<Settings />} />
                    </Route>
                  </Routes>
                </div>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                  }}
                />
              </Router>
            </NotificationProvider>
          </ProjectProvider>
        </AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App; 