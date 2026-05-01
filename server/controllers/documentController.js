import { Document } from '../models/Document.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import fs from 'fs';

export const uploadDocument = async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!title) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Title is required' });
    }

    const result = await uploadToCloudinary(req.file);
    
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const document = await Document.create({
      userId: req.user._id,
      title,
      fileUrl: result.url,
      cloudinaryId: result.publicId
    });

    await ActivityLog.create({
      userId: req.user._id,
      action: 'DOCUMENT_UPLOADED',
      details: { documentId: document._id, title: document.title }
    });

    res.status(201).json(document);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
};

export const getMyDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id }).sort('-createdAt');
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find().populate('userId', 'name email').sort('-createdAt');
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDocumentStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    document.status = status;
    if (remarks) document.remarks = remarks;
    
    await document.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: 'DOCUMENT_STATUS_UPDATED',
      details: { documentId: document._id, status }
    });

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.userId.toString() !== req.user._id.toString() && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await deleteFromCloudinary(document.cloudinaryId);
    await document.deleteOne();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
