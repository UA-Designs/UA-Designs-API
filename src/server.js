const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = new Set([
  'https://ua-designs.vercel.app',
  ...(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
]);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Render health checks, curl, Postman)
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalized = origin.replace(/\/$/, '');

    // Allow exact production/custom domains
    if (allowedOrigins.has(normalized)) {
      callback(null, true);
      return;
    }

    // Optional: allow Vercel preview deployments
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false, // Set true only if using cookie auth.
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting - Increased limits for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 100 to 1000 requests per window for development
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// Speed limiting - Relaxed for development
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 500, // Increased from 50 to 500 requests per 15 minutes, then...
  delayMs: 100 // Reduced delay from 500ms to 100ms per request above limit
});
app.use('/api/', speedLimiter);

// Logging
app.use(morgan('combined'));

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Audit log middleware — intercepts all state-changing /api requests
// Placed after body parsing so req.body is available, before route handlers
app.use('/api', require('./middleware/auditLog'));

// Static file serving for uploaded receipts
app.use('/uploads', require('express').static(require('path').join(__dirname, '../uploads')));

// Core Project Management Knowledge Areas Routes
// 1. Project Schedule Management
app.use('/api/schedule', require('./routes/schedule'));

// 2. Project Cost Management
app.use('/api/cost', require('./routes/cost'));

// 3. Project Resource Management
app.use('/api/resources', require('./routes/resources'));

// 4. Project Risk Management
app.use('/api/risk', require('./routes/risk'));

// 5. Project Stakeholder Management
app.use('/api/stakeholders', require('./routes/stakeholders'));

// Authentication and User Management
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// Project Management
app.use('/api/projects', require('./routes/projects'));

// Dashboard routes
app.use('/api/dashboard', require('./routes/dashboard'));

// Analytics routes
app.use('/api/analytics', require('./routes/analytics'));

// Audit log routes (ADMIN only)
app.use('/api/audit', require('./routes/audit'));

// Additional routes for project management

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    coreAreas: ['Schedule', 'Cost', 'Resources', 'Risk', 'Stakeholders']
  });
});

// Public API endpoints for web interface
// NOTE: These require authentication — data should not be served unauthenticated.
const { authenticateToken } = require('./middleware/auth');

app.get('/api/public/projects', authenticateToken, async (req, res) => {
  try {
    const { Project, User } = require('./models');
    const projects = await Project.findAll({
      include: [{
        model: User,
        as: 'projectManager',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Public projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message
    });
  }
});

app.get('/api/public/users', authenticateToken, async (req, res) => {
  try {
    const { User } = require('./models');
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Public users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

app.get('/api/public/tasks', authenticateToken, async (req, res) => {
  try {
    const { Task, Project } = require('./models');
    const tasks = await Task.findAll({
      include: [{
        model: Project,
        attributes: ['id', 'name']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Public tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
});

// Serve static files and web interface
app.use(express.static('public'));

// Web interface routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UA Designs PMS - Backend Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .nav { display: flex; gap: 10px; margin-bottom: 20px; }
            .nav a { background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            .nav a:hover { background: #2980b9; }
            .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status.ok { background: #d4edda; color: #155724; }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .data-table th, .data-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            .data-table th { background: #f8f9fa; }
            .loading { text-align: center; padding: 20px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏗️ UA Designs Project Management System</h1>
                <p>Backend Dashboard - Core PMBOK Areas: Scheduling, Cost, Resources, Risk, Stakeholders</p>
            </div>
            
            <div class="nav">
                <a href="/">Dashboard</a>
                <a href="/projects">Projects</a>
                <a href="/users">Users</a>
                <a href="/tasks">Tasks</a>
                <a href="/api/health">API Health</a>
            </div>

            <div class="card">
                <h2>📊 System Status</h2>
                <div id="system-status" class="loading">Loading...</div>
            </div>

            <div class="card">
                <h2>📈 Quick Stats</h2>
                <div id="quick-stats" class="loading">Loading...</div>
            </div>
        </div>

        <script>
            // Load system status
            fetch('/api/health')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('system-status').innerHTML = \`
                        <p><span class="status ok">✓ ONLINE</span> Server is running</p>
                        <p><strong>Service:</strong> UA Designs PMS Backend</p>
                        <p><strong>Timestamp:</strong> \${new Date(data.timestamp).toLocaleString()}</p>
                        <p><strong>Core Areas:</strong> \${data.coreAreas.join(', ')}</p>
                    \`;
                })
                .catch(error => {
                    document.getElementById('system-status').innerHTML = '<p style="color: red;">Error loading system status</p>';
                });

            // Load quick stats
            Promise.all([
                fetch('/api/public/projects').then(r => r.json()).catch(() => ({ data: [] })),
                fetch('/api/public/users').then(r => r.json()).catch(() => ({ data: [] })),
                fetch('/api/public/tasks').then(r => r.json()).catch(() => ({ data: [] }))
            ]).then(([projects, users, tasks]) => {
                const projectCount = projects.data ? projects.data.length : 0;
                const userCount = users.data ? users.data.length : 0;
                const taskCount = tasks.data ? tasks.data.length : 0;
                
                document.getElementById('quick-stats').innerHTML = \`
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                        <div style="text-align: center;">
                            <h3 style="margin: 0; color: #3498db;">\${projectCount}</h3>
                            <p style="margin: 5px 0 0 0;">Projects</p>
                        </div>
                        <div style="text-align: center;">
                            <h3 style="margin: 0; color: #e74c3c;">\${userCount}</h3>
                            <p style="margin: 5px 0 0 0;">Users</p>
                        </div>
                        <div style="text-align: center;">
                            <h3 style="margin: 0; color: #f39c12;">\${taskCount}</h3>
                            <p style="margin: 5px 0 0 0;">Tasks</p>
                        </div>
                    </div>
                \`;
            }).catch(error => {
                document.getElementById('quick-stats').innerHTML = '<p style="color: red;">Error loading stats</p>';
            });
        </script>
    </body>
    </html>
  `);
});

// Projects page
app.get('/projects', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Projects - UA Designs PMS</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .nav { display: flex; gap: 10px; margin-bottom: 20px; }
            .nav a { background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            .nav a:hover { background: #2980b9; }
            .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .data-table th, .data-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            .data-table th { background: #f8f9fa; }
            .loading { text-align: center; padding: 20px; color: #666; }
            .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status.planning { background: #fff3cd; color: #856404; }
            .status.active { background: #d4edda; color: #155724; }
            .status.completed { background: #d1ecf1; color: #0c5460; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📋 Projects</h1>
                <p>All projects in the system</p>
            </div>
            
            <div class="nav">
                <a href="/">Dashboard</a>
                <a href="/projects">Projects</a>
                <a href="/users">Users</a>
                <a href="/tasks">Tasks</a>
                <a href="/api/health">API Health</a>
            </div>

            <div class="card">
                <h2>📊 Projects List</h2>
                <div id="projects-list" class="loading">Loading projects...</div>
            </div>
        </div>

        <script>
            fetch('/api/public/projects')
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.data && data.data.length > 0) {
                        const table = \`
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Client</th>
                                        <th>Status</th>
                                        <th>Start Date</th>
                                        <th>End Date</th>
                                        <th>Budget</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    \${data.data.map(project => \`
                                        <tr>
                                            <td><strong>\${project.name}</strong></td>
                                            <td>\${project.clientName || 'N/A'}</td>
                                            <td><span class="status \${project.status}">\${project.status}</span></td>
                                            <td>\${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</td>
                                            <td>\${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}</td>
                                            <td>\$\${project.budget ? project.budget.toLocaleString() : '0'}</td>
                                        </tr>
                                    \`).join('')}
                                </tbody>
                            </table>
                        \`;
                        document.getElementById('projects-list').innerHTML = table;
                    } else {
                        document.getElementById('projects-list').innerHTML = '<p>No projects found.</p>';
                    }
                })
                .catch(error => {
                    document.getElementById('projects-list').innerHTML = '<p style="color: red;">Error loading projects: ' + error.message + '</p>';
                });
        </script>
    </body>
    </html>
  `);
});

// Users page
app.get('/users', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Users - UA Designs PMS</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .nav { display: flex; gap: 10px; margin-bottom: 20px; }
            .nav a { background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            .nav a:hover { background: #2980b9; }
            .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .data-table th, .data-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            .data-table th { background: #f8f9fa; }
            .loading { text-align: center; padding: 20px; color: #666; }
            .role { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .role.admin { background: #f8d7da; color: #721c24; }
            .role.project_manager { background: #d4edda; color: #155724; }
            .role.team_member { background: #d1ecf1; color: #0c5460; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>👥 Users</h1>
                <p>All users in the system</p>
            </div>
            
            <div class="nav">
                <a href="/">Dashboard</a>
                <a href="/projects">Projects</a>
                <a href="/users">Users</a>
                <a href="/tasks">Tasks</a>
                <a href="/api/health">API Health</a>
            </div>

            <div class="card">
                <h2>👤 Users List</h2>
                <div id="users-list" class="loading">Loading users...</div>
            </div>
        </div>

        <script>
            fetch('/api/public/users')
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.data && data.data.length > 0) {
                        const table = \`
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    \${data.data.map(user => \`
                                        <tr>
                                            <td><strong>\${user.firstName} \${user.lastName}</strong></td>
                                            <td>\${user.email}</td>
                                            <td><span class="role \${user.role}">\${user.role}</span></td>
                                            <td>\${user.isActive ? 'Active' : 'Inactive'}</td>
                                            <td>\${new Date(user.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    \`).join('')}
                                </tbody>
                            </table>
                        \`;
                        document.getElementById('users-list').innerHTML = table;
                    } else {
                        document.getElementById('users-list').innerHTML = '<p>No users found.</p>';
                    }
                })
                .catch(error => {
                    document.getElementById('users-list').innerHTML = '<p style="color: red;">Error loading users: ' + error.message + '</p>';
                });
        </script>
    </body>
    </html>
  `);
});

// Tasks page
app.get('/tasks', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tasks - UA Designs PMS</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .nav { display: flex; gap: 10px; margin-bottom: 20px; }
            .nav a { background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            .nav a:hover { background: #2980b9; }
            .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .data-table th, .data-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            .data-table th { background: #f8f9fa; }
            .loading { text-align: center; padding: 20px; color: #666; }
            .priority { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .priority.low { background: #d4edda; color: #155724; }
            .priority.medium { background: #fff3cd; color: #856404; }
            .priority.high { background: #f8d7da; color: #721c24; }
            .priority.critical { background: #f5c6cb; color: #721c24; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Tasks</h1>
                <p>All tasks in the system</p>
            </div>
            
            <div class="nav">
                <a href="/">Dashboard</a>
                <a href="/projects">Projects</a>
                <a href="/users">Users</a>
                <a href="/tasks">Tasks</a>
                <a href="/api/health">API Health</a>
            </div>

            <div class="card">
                <h2>📝 Tasks List</h2>
                <div id="tasks-list" class="loading">Loading tasks...</div>
            </div>
        </div>

        <script>
            fetch('/api/public/tasks')
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.data && data.data.length > 0) {
                        const table = \`
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Task Name</th>
                                        <th>Project</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Start Date</th>
                                        <th>End Date</th>
                                        <th>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    \${data.data.map(task => \`
                                        <tr>
                                            <td><strong>\${task.name}</strong></td>
                                            <td>\${task.projectId || 'N/A'}</td>
                                            <td><span class="priority \${task.priority}">\${task.priority}</span></td>
                                            <td>\${task.status || 'Not Started'}</td>
                                            <td>\${task.startDate ? new Date(task.startDate).toLocaleDateString() : 'N/A'}</td>
                                            <td>\${task.endDate ? new Date(task.endDate).toLocaleDateString() : 'N/A'}</td>
                                            <td>\${task.duration || 'N/A'} days</td>
                                        </tr>
                                    \`).join('')}
                                </tbody>
                            </table>
                        \`;
                        document.getElementById('tasks-list').innerHTML = table;
                    } else {
                        document.getElementById('tasks-list').innerHTML = '<p>No tasks found.</p>';
                    }
                })
                .catch(error => {
                    document.getElementById('tasks-list').innerHTML = '<p style="color: red;">Error loading tasks: ' + error.message + '</p>';
                });
        </script>
    </body>
    </html>
  `);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested resource does not exist'
  });
});

// Only start listening when this file is run directly (e.g. `node src/server.js`).
// When imported by tests via require(), no TCP socket is opened so Jest can exit cleanly.
if (require.main === module) {
  const { sequelize } = require('./models');
  const ensureArchitectRoleEnum = async () => {
    // Existing Render Postgres DBs may already have enum_users_role without ARCHITECT.
    // Add it safely so role inserts/updates work without manual SQL migration.
    if (sequelize.getDialect() !== 'postgres') return;
    try {
      await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'ARCHITECT';`);
    } catch (err) {
      // Ignore when type does not exist yet (fresh DB before first sync).
      if (!/enum_users_role|does not exist/i.test(err.message)) {
        throw err;
      }
    }
  };

  // When SEEDED=true the DB was already set up by a seed script
  // (e.g. dev:clean or dev:demo), so skip force-sync and auto-seed.
  const preSeeded = process.env.SEEDED === 'true';

  const initDb = preSeeded
    ? sequelize.authenticate()
        .then(() => ensureArchitectRoleEnum())
        .then(() => console.log('✅ Database connection verified (pre-seeded)'))
    : (async () => {
        await ensureArchitectRoleEnum();
        const forceSync = process.env.NODE_ENV !== 'production';
        await sequelize.sync({ force: forceSync });
        console.log('✅ Database synced');

        const autoSeed = process.env.AUTO_SEED !== 'false' && process.env.NODE_ENV !== 'production';
        if (autoSeed) {
          try {
            const seed = require('./database/seed');
            await seed();
            console.log('✅ Database seeded');
          } catch (err) {
            console.error('⚠️  Seed failed (non-fatal):', err.message);
          }
        }
      })();

  initDb.then(() => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 UA Designs PMS Server running on port ${PORT}`);
      console.log(`📊 Core Project Management System`);
      console.log(`🎯 Focused on: Scheduling, Cost, Resources, Risk, Stakeholders`);
      console.log(`⏰ ${new Date().toISOString()}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }).catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = app;