import ApiError from '../utils/ApiError.js';

// Restricts a route to specific roles. Always mount AFTER protect().
//   router.post('/', protect, allow('admin', 'landlord'), createProperty)
export const allow =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authenticated'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `Forbidden — requires role: ${roles.join(' or ')}`));
    }
    next();
  };

export default allow;
