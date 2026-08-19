import Tenant from '../models/Tenant.js';
import Lease from '../models/Lease.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { tenantFilter, requireTenantProfile } from '../utils/scope.js';

// GET /api/tenants?q= — admin, landlord
// The ?q= optional query parameter satisfies the course technical checklist.
export const getAllTenants = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const filter = { isDeleted: false, ...(await tenantFilter(req.user)) };

  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
    ];
  }

  const tenants = await Tenant.find(filter).sort('name').lean();

  // Attach the current lease so the list can render "Unit 302 · Sunset Apartments"
  const withUnit = await Promise.all(
    tenants.map(async (t) => {
      const lease = await Lease.findOne({ tenant: t._id, status: 'active', isDeleted: false })
        .populate({ path: 'unit', select: 'unitNumber property', populate: { path: 'property', select: 'name' } })
        .lean();
      return { ...t, currentLease: lease || null };
    }),
  );

  res.status(200).json({ success: true, count: withUnit.length, data: withUnit });
});

// GET /api/tenants/me — tenant
// Resolves the caller's own Tenant profile — the frontend needs this id to
// know which conversation/leases/payments belong to them.
export const getMyTenantProfile = asyncHandler(async (req, res) => {
  const tenant = await requireTenantProfile(req.user);
  await tenant.populate('landlord', 'name email');

  res.status(200).json({ success: true, data: tenant });
});

// GET /api/tenants/:id — admin, landlord, or the tenant themselves
export const getTenantById = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findOne({
    _id: req.params.id,
    isDeleted: false,
    ...(await tenantFilter(req.user)),
  }).populate('user', 'name email role');

  if (!tenant) throw new ApiError(404, 'Tenant not found');

  const leases = await Lease.find({ tenant: tenant._id, isDeleted: false })
    .populate({ path: 'unit', select: 'unitNumber', populate: { path: 'property', select: 'name' } })
    .sort('-startDate');

  res.status(200).json({ success: true, data: { ...tenant.toObject(), leases } });
});

// POST /api/tenants — admin, landlord
// Passing `password` alongside a new tenant issues them login credentials
// in the same step — this is how a landlord gets a tenant into the system
// with an account, since tenants can no longer self-register.
export const createTenant = asyncHandler(async (req, res) => {
  const { user, name, email, phone, password } = req.body;

  let userId = user || undefined;

  if (!userId && password) {
    if (!email) throw new ApiError(400, 'Email is required to set up login credentials');

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) throw new ApiError(409, 'An account with that email already exists');

    const newUser = await User.create({ name, email, password, role: 'tenant' });
    userId = newUser._id;
  }

  const tenant = await Tenant.create({
    user: userId,
    landlord: req.user.role === 'admin' && req.body.landlord ? req.body.landlord : req.user._id,
    name,
    email,
    phone,
  });

  res.status(201).json({ success: true, data: tenant });
});

// POST /api/tenants/:id/credentials — admin, landlord
// Issues login credentials for a tenant that was recorded without an
// account (e.g. a walk-in added before they had one).
export const generateTenantCredentials = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) throw new ApiError(400, 'Password is required');

  const tenant = await Tenant.findOne({
    _id: req.params.id,
    isDeleted: false,
    ...(await tenantFilter(req.user)),
  });
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  if (tenant.user) throw new ApiError(409, 'This tenant already has login credentials');
  if (!tenant.email) throw new ApiError(400, 'Tenant has no email on file — add one first');

  const exists = await User.findOne({ email: tenant.email.toLowerCase() });
  if (exists) throw new ApiError(409, 'An account with that email already exists');

  const newUser = await User.create({
    name: tenant.name,
    email: tenant.email,
    password,
    role: 'tenant',
  });

  tenant.user = newUser._id;
  await tenant.save();

  res.status(200).json({ success: true, data: tenant });
});

// PUT/PATCH /api/tenants/:id — admin, landlord
export const updateTenant = asyncHandler(async (req, res) => {
  const { landlord, isDeleted, ...updates } = req.body;

  const tenant = await Tenant.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false, ...(await tenantFilter(req.user)) },
    updates,
    { new: true, runValidators: true },
  );

  if (!tenant) throw new ApiError(404, 'Tenant not found');

  res.status(200).json({ success: true, data: tenant });
});

// DELETE /api/tenants/:id — admin, landlord (soft delete)
export const deleteTenant = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findOne({
    _id: req.params.id,
    isDeleted: false,
    ...(await tenantFilter(req.user)),
  });

  if (!tenant) throw new ApiError(404, 'Tenant not found');

  const active = await Lease.countDocuments({
    tenant: tenant._id,
    status: 'active',
    isDeleted: false,
  });
  if (active > 0) {
    throw new ApiError(409, 'Cannot delete a tenant with an active lease — terminate it first');
  }

  tenant.isDeleted = true;
  tenant.deletedAt = new Date();
  await tenant.save();

  res.status(200).json({ success: true, message: 'Tenant deleted' });
});
