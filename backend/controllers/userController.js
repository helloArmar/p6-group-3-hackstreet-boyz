import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// GET /api/users?role=&q= — admin only
export const getAllUsers = asyncHandler(async (req, res) => {
  const { role, q } = req.query;
  const filter = { isDeleted: false };

  if (role) filter.role = role;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ];
  }

  const users = await User.find(filter).sort('name');

  res.status(200).json({ success: true, count: users.length, data: users });
});

// GET /api/users/:id — admin only
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isDeleted: false });
  if (!user) throw new ApiError(404, 'User not found');

  res.status(200).json({ success: true, data: user });
});

// POST /api/users — admin only
// Acceptance criteria: "Only admin role can create users with role=propertyManager;
// duplicate email returns 409"
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const exists = await User.findOne({ email: email?.toLowerCase() });
  if (exists) throw new ApiError(409, 'An account with that email already exists');

  // Hashing happens in the User pre-save hook — never here.
  const user = await User.create({ name, email, password, role });
  user.password = undefined; // schema's select:false only applies to queries, not a doc just created

  res.status(201).json({ success: true, data: user });
});

// PUT/PATCH /api/users/:id — admin only
export const updateUser = asyncHandler(async (req, res) => {
  const { password, isDeleted, ...updates } = req.body;

  const user = await User.findOne({ _id: req.params.id, isDeleted: false });
  if (!user) throw new ApiError(404, 'User not found');

  Object.assign(user, updates);
  // Assigning triggers the pre-save hook, so the new password gets hashed.
  if (password) user.password = password;

  await user.save();
  user.password = undefined; // was explicitly set above for hashing — strip before responding

  res.status(200).json({ success: true, data: user });
});

// DELETE /api/users/:id — admin only (soft delete)
export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id) {
    throw new ApiError(409, 'You cannot delete your own account');
  }

  const user = await User.findOne({ _id: req.params.id, isDeleted: false });
  if (!user) throw new ApiError(404, 'User not found');

  user.isDeleted = true;
  user.deletedAt = new Date();
  await user.save();

  res.status(200).json({ success: true, message: 'User deleted' });
});
