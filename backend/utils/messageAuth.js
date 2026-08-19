import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import ApiError from './ApiError.js';
import { requireTenantProfile } from './scope.js';

// Shared by the REST controller and the WebSocket server, so a socket
// joining a room is held to the exact same access rules as an HTTP request.

// Resolves + authorizes a landlord<->tenant conversation. Admin has no
// access here at all — landlord-tenant messages are private between them.
export const resolveTenantConversation = async (user, tenantId) => {
  if (!tenantId) throw new ApiError(400, 'tenant is required');

  if (user.role === 'admin') {
    throw new ApiError(403, 'Admins do not have access to landlord-tenant conversations');
  }

  if (user.role === 'tenant') {
    const own = await requireTenantProfile(user);
    if (String(own._id) !== String(tenantId)) {
      throw new ApiError(403, 'You can only message your own landlord');
    }
    return own;
  }

  const tenant = await Tenant.findOne({ _id: tenantId, landlord: user._id, isDeleted: false });
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  return tenant;
};

// Resolves + authorizes an admin<->landlord conversation, identified by the
// landlord's own User id. Tenants have no access here.
export const resolveLandlordConversation = async (user, landlordId) => {
  if (!landlordId) throw new ApiError(400, 'landlord is required');

  if (user.role === 'tenant') {
    throw new ApiError(403, 'Tenants do not have access to this conversation');
  }

  if (user.role === 'landlord') {
    if (String(user._id) !== String(landlordId)) {
      throw new ApiError(403, 'You can only message admin about your own account');
    }
    return user;
  }

  const landlord = await User.findOne({ _id: landlordId, role: 'landlord', isDeleted: false });
  if (!landlord) throw new ApiError(404, 'Landlord not found');
  return landlord;
};
