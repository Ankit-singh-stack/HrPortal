import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

const GoogleLoginButton = () => {
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // Send the credential to your backend for verification
      const response = await api.post('/auth/google-verify', {
        token: credentialResponse.credential
      });

      const { token, ...userData } = response.data;

      // Store token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      updateUser(userData);

      toast.success('Google login successful!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Google authentication error:', error);
      toast.error('Google authentication failed');
    }
  };

  const handleGoogleError = () => {
    toast.error('Google login failed');
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        text="signin"
        size="large"
        logo_alignment="left"
        width="300"
      />
    </GoogleOAuthProvider>
  );
};

export default GoogleLoginButton;
