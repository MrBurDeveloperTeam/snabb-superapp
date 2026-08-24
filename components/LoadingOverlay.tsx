// LoadingOverlay.tsx
import React from 'react';
import '../styles/LoadingOverlay.css';  // Import styles

const LoadingOverlay: React.FC<{ isLoading: boolean, message?: string }> = ({ isLoading, message }) => {
  if (!isLoading) return null;  // Don't render if not loading

  return (
    <div className="overlay" data-mascot-ignore="true">
      <div className="spinner"></div>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default LoadingOverlay;
