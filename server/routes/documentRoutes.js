import express from 'express';
import { 
  uploadDocument, 
  getMyDocuments, 
  getAllDocuments, 
  updateDocumentStatus, 
  deleteDocument 
} from '../controllers/documentController.js';
import { protect, hrOnly } from '../middleware/auth.js';
import { upload } from '../config/multer.js';

const router = express.Router();

// Routes for employees
router.post('/', protect, upload.single('document'), uploadDocument);
router.get('/my-documents', protect, getMyDocuments);
router.delete('/:id', protect, deleteDocument);

// Routes for HR
router.get('/all', protect, hrOnly, getAllDocuments);
router.put('/:id/status', protect, hrOnly, updateDocumentStatus);

export default router;
