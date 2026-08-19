import express from 'express';

import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePaymentStatus,
  updatePayment,
  deletePayment,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';
import { allow } from '../middleware/role.js';

const router = express.Router();

router.use(protect);

router.get('/', getAllPayments);
router.get('/:id', getPaymentById);
router.post('/', createPayment);
router.patch('/:id/status', allow('admin', 'landlord'), updatePaymentStatus);
router.put('/:id', allow('admin', 'landlord'), updatePayment);
router.delete('/:id', allow('admin', 'landlord'), deletePayment);

export default router;