import Payment from '../models/Payment.js';
import Lease from '../models/Lease.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { validateAttachment } from '../utils/attachment.js';
import { requireTenantProfile, visibleUnitIds } from '../utils/scope.js';

const populatePayment = (query) =>
  query.populate('tenant', 'name email phone').populate({
    path: 'lease',
    populate: { path: 'unit', select: 'unitNumber floor', populate: { path: 'property', select: 'name address' } },
  });

// Admins see everything, landlords only payments against their own units,
// tenants only their own — same shape as leaseController/maintenanceController.
const scopedPaymentFilter = async (user) => {
  if (user.role === 'admin') return {};

  if (user.role === 'tenant') {
    const tenant = await requireTenantProfile(user);
    return { tenant: tenant._id };
  }

  const leaseIds = await Lease.find({ unit: { $in: await visibleUnitIds(user) }, isDeleted: false }).distinct(
    '_id',
  );
  return { lease: { $in: leaseIds } };
};

// GET ALL PAYMENTS
export const getAllPayments = asyncHandler(async (req, res) => {
  const filter = { isDeleted: false, ...(await scopedPaymentFilter(req.user)) };

  const payments = await populatePayment(Payment.find(filter)).sort('-paymentDate');

  res.status(200).json({ success: true, count: payments.length, data: payments });
});

// GET PAYMENT BY ID
export const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await populatePayment(
    Payment.findOne({ _id: req.params.id, isDeleted: false, ...(await scopedPaymentFilter(req.user)) }),
  );

  if (!payment) throw new ApiError(404, 'Payment not found');

  res.status(200).json({ success: true, data: payment });
});

// CREATE PAYMENT — a payment always starts life "pending" review by the
// landlord, regardless of who creates it; status is never client-settable.
export const createPayment = asyncHandler(async (req, res) => {
  const { lease, amount, paymentMethod, reference, notes, proof } = req.body;

  // Tenants can only ever pay for themselves — derive their tenant id from
  // the logged-in account instead of trusting the request body.
  const tenant =
    req.user.role === 'tenant' ? (await requireTenantProfile(req.user))._id.toString() : req.body.tenant;

  const existingLease = await Lease.findById(lease);
  if (!existingLease) throw new ApiError(404, 'Lease not found');

  if (existingLease.tenant.toString() !== tenant) {
    throw new ApiError(400, 'Lease does not belong to this tenant');
  }

  const payment = await Payment.create({
    tenant,
    lease,
    amount,
    paymentMethod,
    reference,
    notes,
    proof: validateAttachment(proof),
  });

  res.status(201).json({
    success: true,
    message: 'Payment created successfully',
    data: await populatePayment(Payment.findById(payment._id)),
  });
});

// PATCH /:id/status — admin, landlord only. Lets the landlord confirm a
// pending payment as received, or reject it (e.g. proof doesn't check out).
export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['paid', 'rejected'];

  if (!allowed.includes(status)) {
    throw new ApiError(400, `status must be one of: ${allowed.join(', ')}`);
  }

  const payment = await Payment.findOne({
    _id: req.params.id,
    isDeleted: false,
    ...(await scopedPaymentFilter(req.user)),
  });

  if (!payment) throw new ApiError(404, 'Payment not found');
  if (payment.status !== 'pending') {
    throw new ApiError(409, `Payment has already been marked ${payment.status}`);
  }

  payment.status = status;
  await payment.save();

  res.status(200).json({
    success: true,
    message: `Payment marked ${status}`,
    data: await populatePayment(Payment.findById(payment._id)),
  });
});

// UPDATE PAYMENT
export const updatePayment = asyncHandler(async (req, res) => {
  const { tenant, lease, status, isDeleted, ...updates } = req.body;

  const payment = await Payment.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false, ...(await scopedPaymentFilter(req.user)) },
    updates,
    { new: true, runValidators: true },
  );

  if (!payment) throw new ApiError(404, 'Payment not found');

  res.status(200).json({ success: true, message: 'Payment updated successfully', data: payment });
});

// DELETE PAYMENT
export const deletePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false, ...(await scopedPaymentFilter(req.user)) },
    { isDeleted: true },
    { new: true },
  );

  if (!payment) throw new ApiError(404, 'Payment not found');

  res.status(200).json({ success: true, message: 'Payment deleted successfully' });
});
