// Wraps an async route handler so rejected promises reach the error middleware
// instead of hanging the request. Removes the try/catch from every controller.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
