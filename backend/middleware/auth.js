import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/token.js';

// Verifies the JWT on every protected route and attaches the live user document.
// Re-reading the user each request means a soft-deleted or role-changed account
// loses access immediately rather than when its token expires.
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authenticated — no token provided');
  }

  let payload;
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    throw new ApiError(401, 'Not authenticated — token invalid or expired');
  }

  const user = await User.findOne({ _id: payload.sub, isDeleted: false }).select('-password');
  if (!user) {
    throw new ApiError(401, 'Not authenticated — account no longer active');
  }

  req.user = user;
  next();
});

export default protect;
