import express from 'express';
import {
  getAllUnits,
  getAvailableUnits,
  getUnitsByProperty,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
} from '../controllers/unitController.js';
import { protect } from '../middleware/auth.js';
import { allow } from '../middleware/role.js';

const router = express.Router();

router.use(protect, allow('admin', 'landlord'));

// Static segments must be declared before /:id or Express matches them as ids.
router.get('/available', getAvailableUnits);
router.get('/property/:propertyId', getUnitsByProperty);

router.route('/').get(getAllUnits).post(createUnit);
router.route('/:id').get(getUnitById).put(updateUnit).patch(updateUnit).delete(deleteUnit);

export default router;
