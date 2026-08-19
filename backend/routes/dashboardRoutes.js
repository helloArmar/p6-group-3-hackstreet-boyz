import express from 'express';
import { getSummary, getRentDue, getPaymentStats } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';
import { allow } from '../middleware/role.js';

const router = express.Router();

router.use(protect);

router.get('/summary', getSummary);
router.get('/rent-due', allow('admin', 'landlord'), getRentDue);
router.get('/payment-stats', allow('admin', 'landlord'), getPaymentStats);

export default router;
