import Property from '../models/Property.js';
import Tenant from '../models/Tenant.js';
import Unit from '../models/Unit.js';
import Lease from '../models/Lease.js';
import ApiError from './ApiError.js';

// Admins see everything. Landlords see only what they own. Tenants see only
// their own records. These helpers return a Mongoose filter fragment so each
// controller stays a one-liner instead of re-deriving ownership rules.

export const propertyFilter = (user) =>
  user.role === 'admin' ? {} : { owner: user._id };

export const tenantFilter = async (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'landlord') return { landlord: user._id };

  const tenant = await Tenant.findOne({ user: user._id, isDeleted: false });
  if (!tenant) throw new ApiError(404, 'No tenant profile linked to this account');
  return { _id: tenant._id };
};

// Ids of every unit the user may touch.
export const visibleUnitIds = async (user) => {
  if (user.role === 'admin') return null; // null = no restriction

  if (user.role === 'landlord') {
    const propertyIds = await Property.find({ owner: user._id, isDeleted: false }).distinct('_id');
    return Unit.find({ property: { $in: propertyIds }, isDeleted: false }).distinct('_id');
  }

  const tenant = await Tenant.findOne({ user: user._id, isDeleted: false });
  if (!tenant) throw new ApiError(404, 'No tenant profile linked to this account');
  return Lease.find({ tenant: tenant._id, isDeleted: false }).distinct('unit');
};

// Resolves the Tenant document for a logged-in tenant user.
export const requireTenantProfile = async (user) => {
  const tenant = await Tenant.findOne({ user: user._id, isDeleted: false });
  if (!tenant) throw new ApiError(404, 'No tenant profile linked to this account');
  return tenant;
};
