class AiAppError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'AiAppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function notFound(message = 'Project not found', code = 'PROJECT_NOT_FOUND') {
  return new AiAppError(message, code, 404);
}

function forbidden(message = 'Insufficient permissions for this project', code = 'PROJECT_FORBIDDEN') {
  return new AiAppError(message, code, 403);
}

function unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
  return new AiAppError(message, code, 401);
}

function badRequest(message, code = 'BAD_REQUEST') {
  return new AiAppError(message, code, 400);
}

function configError(message, code = 'AI_CONFIG') {
  return new AiAppError(message, code, 503);
}

module.exports = {
  AiAppError,
  notFound,
  forbidden,
  unauthorized,
  badRequest,
  configError
};
