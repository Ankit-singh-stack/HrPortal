import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Upload, X } from 'lucide-react';

const ProfilePictureUpload = ({ currentImage, onUploadSuccess }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const { user, updateUser } = useAuth();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    uploadImage(file);
  };

  const uploadImage = async (file) => {
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await api.post('/auth/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const updatedUser = response.data;
      updateUser(updatedUser);
      setPreview(updatedUser.profile.profilePicture);

      toast.success('Profile picture updated successfully!');
      if (onUploadSuccess) {
        onUploadSuccess(updatedUser.profile.profilePicture);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload image');
      setPreview(currentImage); // Revert to current image on error
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-gray-200 bg-gray-100 flex items-center justify-center">
        {preview ? (
          <>
            <img
              src={preview}
              alt="Profile"
              className="w-full h-full object-cover"
            />
            {!uploading && (
              <button
                onClick={handleRemoveImage}
                className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
              >
                <X size={16} />
              </button>
            )}
          </>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto text-gray-400 mb-2" size={32} />
            <span className="text-xs text-gray-500">Upload Photo</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <Upload size={18} />
        {uploading ? 'Uploading...' : 'Choose Photo'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Recommended: Square image, min 200x200px, max 5MB
      </p>
    </div>
  );
};

export default ProfilePictureUpload;
