import express from 'express';
import {
  getAllBills,
  getBillById,
  createBill,
  updateBill,
  deleteBill,
} from '../controllers/billController.js';
import { protect } from '../middleware/auth.js';
import { allow } from '../middleware/role.js';

const router = express.Router();

router.use(protect, allow('admin', 'landlord'));

router.route('/').get(getAllBills).post(createBill);
router.route('/:id').get(getBillById).put(updateBill).patch(updateBill).delete(deleteBill);

export default router;
