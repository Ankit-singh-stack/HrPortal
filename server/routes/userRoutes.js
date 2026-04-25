import express from 'express';
import { getUsers, getUserById, updateUser, deleteUser } from '../controllers/userController.js';
import { protect, hrOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, hrOnly, getUsers);
router.get('/profile', protect, getUserById);
router.get('/:id', protect, getUserById);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, hrOnly, deleteUser);

export default router;