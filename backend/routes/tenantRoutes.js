import express from 'express';
import {
  getAllTenants,
  getMyTenantProfile,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  generateTenantCredentials,
} from '../controllers/tenantController.js';
import { protect } from '../middleware/auth.js';
import { allow } from '../middleware/role.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(allow('admin', 'landlord'), getAllTenants)
  .post(allow('admin', 'landlord'), createTenant);

// Must come before /:id, or Express would match "me" as an :id param.
router.get('/me', allow('tenant'), getMyTenantProfile);

router
  .route('/:id')
  .get(getTenantById) // scoped in the controller — a tenant may read their own record
  .put(allow('admin', 'landlord'), updateTenant)
  .patch(allow('admin', 'landlord'), updateTenant)
  .delete(allow('admin', 'landlord'), deleteTenant);

router.post('/:id/credentials', allow('admin', 'landlord'), generateTenantCredentials);

export default router;
