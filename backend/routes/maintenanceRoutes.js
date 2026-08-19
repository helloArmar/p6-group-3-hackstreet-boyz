import express from 'express';
import {
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequest,
  updateRequestStatus,
  deleteRequest,
} from '../controllers/maintenanceController.js';
import { protect } from '../middleware/auth.js';
import { allow } from '../middleware/role.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getAllRequests).post(createRequest);

router.patch('/:id/status', allow('admin', 'landlord'), updateRequestStatus);

router
  .route('/:id')
  .get(getRequestById)
  .put(allow('admin', 'landlord'), updateRequest)
  .delete(allow('admin', 'landlord'), deleteRequest);

export default router;
