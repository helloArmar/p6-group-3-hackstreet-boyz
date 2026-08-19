import Property from '../models/Property.js';
import Unit from '../models/Unit.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { propertyFilter } from '../utils/scope.js';

// GET /api/properties?q=  — admin, landlord
export const getAllProperties = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const filter = { isDeleted: false, ...propertyFilter(req.user) };

  if (q) filter.name = { $regex: q, $options: 'i' };

  const properties = await Property.find(filter).sort('name').lean();

  // Attach occupancy so the list can render "18 / 20 units occupied"
  const withCounts = await Promise.all(
    properties.map(async (p) => {
      const [total, occupied] = await Promise.all([
        Unit.countDocuments({ property: p._id, isDeleted: false }),
        Unit.countDocuments({ property: p._id, isDeleted: false, status: 'occupied' }),
      ]);
      return { ...p, unitCount: total, occupiedCount: occupied };
    }),
  );

  res.status(200).json({ success: true, count: withCounts.length, data: withCounts });
});

// GET /api/properties/:id — admin, landlord
export const getPropertyById = asyncHandler(async (req, res) => {
  const property = await Property.findOne({
    _id: req.params.id,
    isDeleted: false,
    ...propertyFilter(req.user),
  }).populate({ path: 'units', match: { isDeleted: false }, options: { sort: { unitNumber: 1 } } });

  if (!property) throw new ApiError(404, 'Property not found');

  res.status(200).json({ success: true, data: property });
});

// POST /api/properties — admin, landlord
export const createProperty = asyncHandler(async (req, res) => {
  const { name, type, address, floors, description } = req.body;

  // Owner comes from the token, never the body — otherwise a landlord could
  // create properties under someone else's name.
  const property = await Property.create({
    owner: req.user._id,
    name,
    type,
    address,
    floors,
    description,
  });

  res.status(201).json({ success: true, data: property });
});

// PUT/PATCH /api/properties/:id — admin, landlord
export const updateProperty = asyncHandler(async (req, res) => {
  const { owner, isDeleted, ...updates } = req.body; // never reassign ownership here

  const property = await Property.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false, ...propertyFilter(req.user) },
    updates,
    { new: true, runValidators: true },
  );

  if (!property) throw new ApiError(404, 'Property not found');

  res.status(200).json({ success: true, data: property });
});

// DELETE /api/properties/:id — admin (soft delete)
export const deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findOne({ _id: req.params.id, isDeleted: false });
  if (!property) throw new ApiError(404, 'Property not found');

  const occupied = await Unit.countDocuments({
    property: property._id,
    isDeleted: false,
    status: 'occupied',
  });
  if (occupied > 0) {
    throw new ApiError(409, `Cannot delete: ${occupied} unit(s) are still occupied`);
  }

  property.isDeleted = true;
  property.deletedAt = new Date();
  await property.save();

  // Cascade the soft delete to units so they stop showing up in listings.
  await Unit.updateMany(
    { property: property._id, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() },
  );

  res.status(200).json({ success: true, message: 'Property deleted' });
});
