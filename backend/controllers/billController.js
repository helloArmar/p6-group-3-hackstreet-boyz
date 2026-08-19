import Bill from '../models/Bill.js';
import Property from '../models/Property.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { propertyFilter } from '../utils/scope.js';

// See BLOCKERS.md B-002 — this resource is not in the proposal. Retained as-is
// from the team's existing work, now with auth and scoping applied.

const scopedFilter = async (user) => {
  if (user.role === 'admin') return {};
  const propertyIds = await Property.find({ isDeleted: false, ...propertyFilter(user) }).distinct('_id');
  return { property: { $in: propertyIds } };
};

// GET /api/bills?status= — admin, landlord
export const getAllBills = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { isDeleted: false, ...(await scopedFilter(req.user)) };

  if (status) filter.status = status;

  const bills = await Bill.find(filter).populate('property', 'name').sort('dueDate');

  res.status(200).json({ success: true, count: bills.length, data: bills });
});

// GET /api/bills/:id — admin, landlord
export const getBillById = asyncHandler(async (req, res) => {
  const bill = await Bill.findOne({
    _id: req.params.id,
    isDeleted: false,
    ...(await scopedFilter(req.user)),
  }).populate('property', 'name');

  if (!bill) throw new ApiError(404, 'Bill not found');

  res.status(200).json({ success: true, data: bill });
});

// POST /api/bills — admin, landlord
export const createBill = asyncHandler(async (req, res) => {
  const { property, description, amount, dueDate } = req.body;

  const owned = await Property.findOne({ _id: property, isDeleted: false, ...propertyFilter(req.user) });
  if (!owned) throw new ApiError(404, 'Property not found');

  const bill = await Bill.create({ property, description, amount, dueDate });

  res.status(201).json({ success: true, data: bill });
});

// PUT/PATCH /api/bills/:id — admin, landlord
export const updateBill = asyncHandler(async (req, res) => {
  const { property, isDeleted, ...updates } = req.body;

  const bill = await Bill.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false, ...(await scopedFilter(req.user)) },
    updates,
    { new: true, runValidators: true },
  );

  if (!bill) throw new ApiError(404, 'Bill not found');

  res.status(200).json({ success: true, data: bill });
});

// DELETE /api/bills/:id — admin, landlord (soft delete)
export const deleteBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findOne({
    _id: req.params.id,
    isDeleted: false,
    ...(await scopedFilter(req.user)),
  });

  if (!bill) throw new ApiError(404, 'Bill not found');

  bill.isDeleted = true;
  bill.deletedAt = new Date();
  await bill.save();

  res.status(200).json({ success: true, message: 'Bill deleted' });
});
