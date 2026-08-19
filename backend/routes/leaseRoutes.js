import express from 'express';
import {
  getAllLeases,
  getLeaseById,
  createLease,
  updateLease,
  terminateLease,
  deleteLease,
} from '../controllers/leaseController.js';
import { protect } from '../middleware/auth.js';
import { allow } from '../middleware/role.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getAllLeases).post(allow('admin', 'landlord'), createLease);

router.patch('/:id/terminate', allow('admin', 'landlord'), terminateLease);

router
  .route('/:id')
  .get(getLeaseById)
  .put(allow('admin', 'landlord'), updateLease)
  .patch(allow('admin', 'landlord'), updateLease)
  .delete(allow('admin'), deleteLease);

export default router;
