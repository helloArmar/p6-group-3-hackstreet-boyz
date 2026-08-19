// Thrown by controllers to signal a specific HTTP status.
// Anything else that escapes a controller becomes a 500.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export default ApiError;
