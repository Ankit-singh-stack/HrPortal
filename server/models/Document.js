import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  cloudinaryId: {
    type: String,
    required: true
  },
  /** Cloudinary resource_type for delete; PDF/DOC use raw (browser-safe URL). */
  cloudinaryResourceType: {
    type: String,
    enum: ['image', 'raw'],
    default: 'image'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  remarks: {
    type: String
  }
}, {
  timestamps: true
});

export const Document = mongoose.model('Document', documentSchema);
