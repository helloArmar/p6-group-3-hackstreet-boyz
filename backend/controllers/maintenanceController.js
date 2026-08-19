import MaintenanceRequest from '../models/MaintenanceRequest.js';
import Lease from '../models/Lease.js';
import Unit from '../models/Unit.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { requireTenantProfile, visibleUnitIds } from '../utils/scope.js';
import { sendMaintenanceCompletedEmail } from '../utils/notifications.js';

const scopedFilter = async (user) => {
  if (user.role === 'admin') return {};

  if (user.role === 'tenant') {
    const tenant = await requireTenantProfile(user);
    return { tenant: tenant._id };
  }

  return { unit: { $in: await visibleUnitIds(user) } };
};

const populateRequest = (query) =>
  query.populate('tenant', 'name email phone').populate({
    path: 'unit',
    select: 'unitNumber floor',
    populate: { path: 'property', select: 'name' },
  });

export const getAllRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { isDeleted: false, ...(await scopedFilter(req.user)) };

  if (status) filter.status = status;

  const requests = await populateRequest(MaintenanceRequest.find(filter)).sort(
    '-dateSubmitted',
  );

  res
    .status(200)
    .json({ success: true, count: requests.length, data: requests });
});

export const getRequestById = asyncHandler(async (req, res) => {
  const request = await populateRequest(
    MaintenanceRequest.findOne({
      _id: req.params.id,
      isDeleted: false,
      ...(await scopedFilter(req.user)),
    }),
  );

  if (!request) throw new ApiError(404, 'Maintenance request not found');

  res.status(200).json({ success: true, data: request });
});

export const createRequest = asyncHandler(async (req, res) => {
  const { title, description, priority } = req.body;
  let { unit, tenant } = req.body;

  if (req.user.role === 'tenant') {
    const tenantDoc = await requireTenantProfile(req.user);
    tenant = tenantDoc._id;

    const activeLease = await Lease.findOne({
      tenant: tenantDoc._id,
      status: 'active',
      isDeleted: false,
    });
    if (!activeLease)
      throw new ApiError(
        409,
        'You have no active lease to raise a request against',
      );

    unit = activeLease.unit;
  } else {
    if (!unit || !tenant)
      throw new ApiError(400, 'unit and tenant are required');
    const unitDoc = await Unit.findOne({ _id: unit, isDeleted: false });
    if (!unitDoc) throw new ApiError(404, 'Unit not found');
  }

  const request = await MaintenanceRequest.create({
    tenant,
    unit,
    title,
    description,
    priority,
  });

  res.status(201).json({
    success: true,
    data: await populateRequest(MaintenanceRequest.findById(request._id)),
  });
});

export const updateRequestStatus = asyncHandler(async (req, res) => {
  const { status, assignedTo } = req.body;
  const allowed = ['pending', 'assigned', 'in_progress', 'completed'];

  if (!allowed.includes(status)) {
    throw new ApiError(400, `status must be one of: ${allowed.join(', ')}`);
  }

  const request = await populateRequest(
    MaintenanceRequest.findOne({
      _id: req.params.id,
      isDeleted: false,
      ...(await scopedFilter(req.user)),
    }),
  );

  if (!request) throw new ApiError(404, 'Maintenance request not found');

  const wasCompleted = request.status === 'completed';
  request.status = status;
  if (assignedTo !== undefined) request.assignedTo = assignedTo;
  request.completedAt = status === 'completed' ? new Date() : null;
  await request.save();

  if (status === 'completed' && !wasCompleted) {
    const emailSent = await sendMaintenanceCompletedEmail(request);

    if (!emailSent) {
      console.warn(
        `[maintenance] Status updated successfully, but completion email was not sent for request ${request._id}`,
      );
    }
  }

  res.status(200).json({ success: true, data: request });
});

export const updateRequest = asyncHandler(async (req, res) => {
  const { tenant, unit, isDeleted, ...updates } = req.body;

  const request = await MaintenanceRequest.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false, ...(await scopedFilter(req.user)) },
    updates,
    { new: true, runValidators: true },
  );

  if (!request) throw new ApiError(404, 'Maintenance request not found');

  res.status(200).json({ success: true, data: request });
});

export const deleteRequest = asyncHandler(async (req, res) => {
  const request = await MaintenanceRequest.findOne({
    _id: req.params.id,
    isDeleted: false,
    ...(await scopedFilter(req.user)),
  });

  if (!request) throw new ApiError(404, 'Maintenance request not found');

  request.isDeleted = true;
  request.deletedAt = new Date();
  await request.save();

  res
    .status(200)
    .json({ success: true, message: 'Maintenance request deleted' });
});
