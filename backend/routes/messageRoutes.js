import express from 'express';
import { getMessages, getThreads, sendMessage, deleteMessage } from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import { allow } from '../middleware/role.js';

const router = express.Router();

router.use(protect);

router.get('/threads', allow('admin', 'landlord'), getThreads);

router.route('/').get(getMessages).post(sendMessage);

router.delete('/:id', deleteMessage);

export default router;
