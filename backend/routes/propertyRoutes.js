import express from 'express';
import {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
} from '../controllers/propertyController.js';
import { protect } from '../middleware/auth.js';
import { allow } from '../middleware/role.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(allow('admin', 'landlord'), getAllProperties)
  .post(allow('admin', 'landlord'), createProperty);

router
  .route('/:id')
  .get(allow('admin', 'landlord'), getPropertyById)
  .put(allow('admin', 'landlord'), updateProperty)
  .patch(allow('admin', 'landlord'), updateProperty)
  .delete(allow('admin'), deleteProperty); // proposal endpoint #9: admin only

export default router;
