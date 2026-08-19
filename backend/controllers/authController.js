import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signToken } from '../utils/token.js';

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

// POST /api/auth/login — public
// There is no public registration. Admin accounts are created by other
// admins through POST /api/users; landlord accounts are created by admins
// the same way; tenant accounts get their login from their landlord
// through POST /api/tenants/:id/credentials.
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false }).select(
    '+password',
  );

  // Same message either way — don't reveal which accounts exist.
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  res.status(200).json({
    success: true,
    data: { user: publicUser(user), token: signToken(user) },
  });
});

// GET /api/auth/me — authenticated
export const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: publicUser(req.user) });
});

// PATCH /api/auth/me — authenticated
export const updateMe = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (name) user.name = name;
  if (email) user.email = email;
  if (password) user.password = password; // re-hashed by the pre-save hook

  await user.save();
  res.status(200).json({ success: true, data: publicUser(user) });
});

// POST /api/auth/logout — authenticated
// Tokens are stateless, so logout is client-side (discard the token). This
// endpoint exists so the client has one call to make and the proposal's
// endpoint #4 is satisfied.
export const logout = asyncHandler(async (_req, res) => {
  res.status(200).json({ success: true, message: 'Logged out — discard your token' });
});
