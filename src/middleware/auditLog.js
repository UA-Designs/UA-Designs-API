const { AuditLog } = require('../models');

// Maps route path segments to entity type strings
const PATH_ENTITY_MAP = [
  // Cost
  { pattern: /\/api\/cost\/budgets/, entity: 'BUDGET' },
  { pattern: /\/api\/cost\/expenses/, entity: 'EXPENSE' },
  { pattern: /\/api\/cost\/costs/, entity: 'COST' },
  { pattern: /\/api\/cost\/analysis/, entity: 'COST' },
  // Schedule
  { pattern: /\/api\/schedule\/tasks/, entity: 'TASK' },
  { pattern: /\/api\/schedule\/projects\/[^/]+\/tasks/, entity: 'TASK' },
  { pattern: /\/api\/schedule\/dependencies/, entity: 'DEPENDENCY' },
  { pattern: /\/api\/schedule\/projects\/[^/]+\/dependencies/, entity: 'DEPENDENCY' },
  // Resources
  { pattern: /\/api\/resources\/materials/, entity: 'MATERIAL' },
  { pattern: /\/api\/resources\/labor/, entity: 'LABOR' },
  { pattern: /\/api\/resources\/equipment/, entity: 'EQUIPMENT' },
  { pattern: /\/api\/resources\/team/, entity: 'TEAM_MEMBER' },
  { pattern: /\/api\/resources\/allocations/, entity: 'ALLOCATION' },
  // Risk
  { pattern: /\/api\/risk\/mitigations/, entity: 'MITIGATION' },
  { pattern: /\/api\/risk\/risks/, entity: 'RISK' },
  // Stakeholders
  { pattern: /\/api\/stakeholders\/[^/]+\/communications/, entity: 'COMMUNICATION' },
  { pattern: /\/api\/stakeholders\/communications/, entity: 'COMMUNICATION' },
  { pattern: /\/api\/stakeholders/, entity: 'STAKEHOLDER' },
  // Users / Auth
  { pattern: /\/api\/users/, entity: 'USER' },
  { pattern: /\/api\/auth/, entity: 'USER' },
  // Projects
  { pattern: /\/api\/projects/, entity: 'PROJECT' },
];

// Determine entity type from request path
function resolveEntity(path) {
  for (const entry of PATH_ENTITY_MAP) {
    if (entry.pattern.test(path)) return entry.entity;
  }
  return 'UNKNOWN';
}

// Determine action from method + path suffix
function resolveAction(method, path) {
  const lowerPath = path.toLowerCase();

  // Auth-specific overrides
  if (lowerPath.includes('/auth/login')) return 'LOGIN';
  if (lowerPath.includes('/auth/logout')) return 'LOGOUT';
  if (lowerPath.includes('/auth/register')) return 'REGISTER';
  if (lowerPath.includes('/auth/change-password')) return 'PASSWORD_CHANGE';

  // Path-suffix based overrides (before general method check)
  if (lowerPath.endsWith('/approve') || lowerPath.includes('/bulk-approve')) return 'APPROVE';
  if (lowerPath.endsWith('/reject')) return 'REJECT';
  if (lowerPath.endsWith('/escalate')) return 'ESCALATE';
  if (
    lowerPath.endsWith('/status') ||
    lowerPath.endsWith('/deactivate') ||
    lowerPath.endsWith('/activate') ||
    lowerPath.endsWith('/close') ||
    lowerPath.endsWith('/pay') ||
    lowerPath.endsWith('/assign-manager')
  ) return 'STATUS_CHANGE';

  // General method mapping
  switch (method.toUpperCase()) {
    case 'POST':   return 'CREATE';
    case 'PUT':    return 'UPDATE';
    case 'PATCH':  return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default:       return 'UPDATE';
  }
}

// Build a human-readable description
function buildDescription(action, entity, name) {
  const entityLabel = entity.charAt(0) + entity.slice(1).toLowerCase().replace(/_/g, ' ');
  const suffix = name ? ` '${name}'` : '';
  switch (action) {
    case 'CREATE':          return `Created ${entityLabel}${suffix}`;
    case 'UPDATE':          return `Updated ${entityLabel}${suffix}`;
    case 'DELETE':          return `Deleted ${entityLabel}${suffix}`;
    case 'STATUS_CHANGE':   return `Changed status of ${entityLabel}${suffix}`;
    case 'APPROVE':         return `Approved ${entityLabel}${suffix}`;
    case 'REJECT':          return `Rejected ${entityLabel}${suffix}`;
    case 'ESCALATE':        return `Escalated ${entityLabel}${suffix}`;
    case 'LOGIN':           return 'User logged in';
    case 'LOGOUT':          return 'User logged out';
    case 'REGISTER':        return `User registered${suffix}`;
    case 'PASSWORD_CHANGE': return 'User changed password';
    default:                return `${action} on ${entityLabel}${suffix}`;
  }
}

// Determine if a given request should be logged
function shouldLog(method, path) {
  const upper = method.toUpperCase();
  // Always log state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(upper)) return true;
  // Never log GETs (read-only / too noisy)
  return false;
}

// Extract the primary record id from the response body
function extractEntityId(responseBody) {
  if (!responseBody || !responseBody.data) return null;
  const d = responseBody.data;
  return d.id || d.budgetId || d.expenseId || null;
}

// Extract a friendly record name from request body or response body
function extractName(reqBody, responseBody) {
  if (reqBody) {
    if (reqBody.name)  return reqBody.name;
    if (reqBody.title) return reqBody.title;
    if (reqBody.firstName && reqBody.lastName) return `${reqBody.firstName} ${reqBody.lastName}`;
  }
  if (responseBody && responseBody.data) {
    const d = responseBody.data;
    if (d.name)  return d.name;
    if (d.title) return d.title;
    if (d.firstName && d.lastName) return `${d.firstName} ${d.lastName}`;
  }
  return null;
}

// Response-intercepting audit log middleware
const auditLogMiddleware = (req, res, next) => {
  // Skip GET requests (read-only — not state-changing)
  if (!shouldLog(req.method, req.path)) return next();

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // Invoke original res.json to send the response immediately
    const result = originalJson(body);

    // Fire-and-forget: write the audit log asynchronously after response is sent
    const statusCode = res.statusCode;
    const path = req.originalUrl || req.path;
    const method = req.method;
    const entity = resolveEntity(path);
    const action = resolveAction(method, path);
    const name = extractName(req.body, body);
    const description = buildDescription(action, entity, name);
    const entityId = extractEntityId(body);

    const userId = req.user ? req.user.id : null;
    const ipAddress = req.ip || req.connection?.remoteAddress || null;

    AuditLog.create({
      userId,
      action,
      entity,
      entityId,
      description,
      details: {
        requestBody: req.body || null,
        responseStatus: statusCode
      },
      ipAddress,
      method,
      path,
      statusCode
    }).catch(err => {
      console.error('[AuditLog] Failed to write audit log entry:', err.message);
    });

    return result;
  };

  next();
};

module.exports = auditLogMiddleware;
