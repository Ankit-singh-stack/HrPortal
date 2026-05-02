import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function resolveResourceType(file) {
  const mimetype = (file.mimetype || '').toLowerCase();
  const name = (file.originalname || '').toLowerCase();

  // Word documents must be 'raw' for proper download handling
  const isDoc =
    mimetype === 'application/msword' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.doc') ||
    name.endsWith('.docx');

  if (isDoc) return 'raw';

  // For PDFs and Images, use 'auto' to allow browser-side viewing.
  return 'auto';
}

/** Profile pictures etc. — images only */
export const uploadToCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'hr-portal',
      resource_type: 'auto',
      access_mode: 'public'
    });
    console.log('✅ Cloudinary Upload Success:', result.secure_url);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type || 'image'
    };
  } catch (error) {
    console.error('❌ Cloudinary Upload Error:', error);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

/** HR documents — PDF/DOC as raw so browser gets correct file (image/upload PDFs often break in Edge). */
export const uploadDocumentToCloudinary = async (file) => {
  try {
    const resourceType = resolveResourceType(file);
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'hr-portal',
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      access_mode: 'public'
    });
    console.log('✅ Cloudinary document upload:', result.secure_url, resourceType);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type || resourceType
    };
  } catch (error) {
    console.error('❌ Cloudinary document upload error:', error);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const rt = resourceType === 'raw' ? 'raw' : 'image';
    await cloudinary.uploader.destroy(publicId, { resource_type: rt });
  } catch (error) {
    throw new Error(`Cloudinary delete failed: ${error.message}`);
  }
};

export default cloudinary;
