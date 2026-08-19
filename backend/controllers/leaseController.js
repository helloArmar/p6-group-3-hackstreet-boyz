import Lease from '../models/Lease.js';
import Unit from '../models/Unit.js';
import Tenant from '../models/Tenant.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { tenantFilter, visibleUnitIds } from '../utils/scope.js';

const scopedLeaseFilter = async (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'tenant') return await tenantFilter(user).then((f) => ({ tenant: f._id }));

  const unitIds = await visibleUnitIds(user);
  return { unit: { $in: unitIds } };
};

const populateLease = (query) =>
  query
    .populate('tenant', 'name email phone')
    .populate({ path: 'unit', select: 'unitNumber floor', populate: { path: 'property', select: 'name address' } });

// GET /api/leases?status= — all roles (scoped)
// The ?status= optional query parameter satisfies the course technical checklist.
export const getAllLeases = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { isDeleted: false, ...(await scopedLeaseFilter(req.user)) };

  if (status) filter.status = status;

  const leases = await populateLease(Lease.find(filter)).sort('-startDate');

  res.status(200).json({ success: true, count: leases.length, data: leases });
});

// GET /api/leases/:id — all roles (scoped)
export const getLeaseById = asyncHandler(async (req, res) => {
  const lease = await populateLease(
    Lease.findOne({ _id: req.params.id, isDeleted: false, ...(await scopedLeaseFilter(req.user)) }),
  );

  if (!lease) throw new ApiError(404, 'Lease not found');

  res.status(200).json({ success: true, data: lease });
});

// POST /api/leases — admin, landlord
export const createLease = asyncHandler(async (req, res) => {
  const { tenant, unit, startDate, endDate, monthlyRent, securityDeposit } = req.body;

  const tenantDoc = await Tenant.findOne({ _id: tenant, isDeleted: false });
  if (!tenantDoc) throw new ApiError(404, 'Tenant not found');

  const unitDoc = await Unit.findOne({ _id: unit, isDeleted: false });
  if (!unitDoc) throw new ApiError(404, 'Unit not found');
  if (unitDoc.status === 'occupied') {
    throw new ApiError(409, 'That unit is already occupied');
  }

  const lease = await Lease.create({
    tenant,
    unit,
    startDate,
    endDate,
    monthlyRent: monthlyRent ?? unitDoc.monthlyRent,
    securityDeposit,
  });

  // Acceptance criteria: "the unit's status updates to occupied on creation"
  unitDoc.status = 'occupied';
  await unitDoc.save();

  res.status(201).json({ success: true, data: await populateLease(Lease.findById(lease._id)) });
});

// PUT/PATCH /api/leases/:id — admin, landlord
export const updateLease = asyncHandler(async (req, res) => {
  const { tenant, unit, isDeleted, ...updates } = req.body; // reassignment = new lease

  const lease = await Lease.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false, ...(await scopedLeaseFilter(req.user)) },
    updates,
    { new: true, runValidators: true },
  );

  if (!lease) throw new ApiError(404, 'Lease not found');

  res.status(200).json({ success: true, data: lease });
});

// PATCH /api/leases/:id/terminate — admin, landlord
export const terminateLease = asyncHandler(async (req, res) => {
  const lease = await Lease.findOne({
    _id: req.params.id,
    isDeleted: false,
    ...(await scopedLeaseFilter(req.user)),
  });

  if (!lease) throw new ApiError(404, 'Lease not found');
  if (lease.status === 'terminated') throw new ApiError(409, 'Lease is already terminated');

  lease.status = 'terminated';
  lease.terminatedAt = new Date();
  await lease.save();

  // Free the unit back up for the next tenant.
  await Unit.findByIdAndUpdate(lease.unit, { status: 'vacant' });

  res.status(200).json({ success: true, data: lease });
});

// DELETE /api/leases/:id — admin (soft delete)
export const deleteLease = asyncHandler(async (req, res) => {
  const lease = await Lease.findOne({ _id: req.params.id, isDeleted: false });
  if (!lease) throw new ApiError(404, 'Lease not found');

  lease.isDeleted = true;
  lease.deletedAt = new Date();
  await lease.save();

  if (lease.status === 'active') {
    await Unit.findByIdAndUpdate(lease.unit, { status: 'vacant' });
  }

  res.status(200).json({ success: true, message: 'Lease deleted' });
});
