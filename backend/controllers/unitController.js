import Unit from '../models/Unit.js';
import Property from '../models/Property.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { propertyFilter } from '../utils/scope.js';

// Confirms the caller may act on the given property.
const assertOwnsProperty = async (user, propertyId) => {
  const property = await Property.findOne({
    _id: propertyId,
    isDeleted: false,
    ...propertyFilter(user),
  });
  if (!property) throw new ApiError(404, 'Property not found');
  return property;
};

const scopedUnitFilter = async (user) => {
  if (user.role === 'admin') return {};
  const propertyIds = await Property.find({ owner: user._id, isDeleted: false }).distinct('_id');
  return { property: { $in: propertyIds } };
};

// GET /api/units?status=&property= — admin, landlord
export const getAllUnits = asyncHandler(async (req, res) => {
  const { status, property } = req.query;
  const filter = { isDeleted: false, ...(await scopedUnitFilter(req.user)) };

  if (status) filter.status = status;
  if (property) filter.property = property;

  const units = await Unit.find(filter).populate('property', 'name address').sort('unitNumber');

  res.status(200).json({ success: true, count: units.length, data: units });
});

// GET /api/units/available — admin, landlord
export const getAvailableUnits = asyncHandler(async (req, res) => {
  const units = await Unit.find({
    isDeleted: false,
    status: 'vacant',
    ...(await scopedUnitFilter(req.user)),
  })
    .populate('property', 'name address')
    .sort('unitNumber');

  res.status(200).json({ success: true, count: units.length, data: units });
});

// GET /api/units/property/:propertyId — admin, landlord
export const getUnitsByProperty = asyncHandler(async (req, res) => {
  await assertOwnsProperty(req.user, req.params.propertyId);

  const units = await Unit.find({ property: req.params.propertyId, isDeleted: false }).sort(
    'unitNumber',
  );

  res.status(200).json({ success: true, count: units.length, data: units });
});

// GET /api/units/:id — admin, landlord
export const getUnitById = asyncHandler(async (req, res) => {
  const unit = await Unit.findOne({
    _id: req.params.id,
    isDeleted: false,
    ...(await scopedUnitFilter(req.user)),
  }).populate('property', 'name address');

  if (!unit) throw new ApiError(404, 'Unit not found');

  res.status(200).json({ success: true, data: unit });
});

// POST /api/units — admin, landlord
export const createUnit = asyncHandler(async (req, res) => {
  const { property, unitNumber, floor, monthlyRent, description } = req.body;

  await assertOwnsProperty(req.user, property);

  const unit = await Unit.create({ property, unitNumber, floor, monthlyRent, description });

  res.status(201).json({ success: true, data: unit });
});

// PUT/PATCH /api/units/:id — admin, landlord
export const updateUnit = asyncHandler(async (req, res) => {
  const { property, isDeleted, ...updates } = req.body; // units don't move between properties

  const unit = await Unit.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false, ...(await scopedUnitFilter(req.user)) },
    updates,
    { new: true, runValidators: true },
  );

  if (!unit) throw new ApiError(404, 'Unit not found');

  res.status(200).json({ success: true, data: unit });
});

// DELETE /api/units/:id — admin, landlord (soft delete)
export const deleteUnit = asyncHandler(async (req, res) => {
  const unit = await Unit.findOne({
    _id: req.params.id,
    isDeleted: false,
    ...(await scopedUnitFilter(req.user)),
  });

  if (!unit) throw new ApiError(404, 'Unit not found');
  if (unit.status === 'occupied') {
    throw new ApiError(409, 'Cannot delete an occupied unit — terminate the lease first');
  }

  unit.isDeleted = true;
  unit.deletedAt = new Date();
  await unit.save();

  res.status(200).json({ success: true, message: 'Unit deleted' });
});
