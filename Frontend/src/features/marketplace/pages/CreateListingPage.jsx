import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingsApi } from '../api/listingsApi';
import { ListingForm } from '../components/ListingForm';
import '../marketplace.css';

export const CreateListingPage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreate = async (formData, pendingFiles) => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');

      // 1. Create the listing
      const newListing = await listingsApi.createListing(formData);

      // 2. Upload images if provided
      if (pendingFiles && pendingFiles.length > 0) {
        try {
          await listingsApi.uploadImages(newListing._id, pendingFiles);
        } catch (imgError) {
          setToastMessage('Listing created, but image upload encountered an error. You can re-upload photos in Edit.');
          setTimeout(() => navigate(`/marketplace/${newListing._id}`), 2500);
          return;
        }
      }

      setToastMessage('Listing created successfully!');
      setTimeout(() => navigate(`/marketplace/${newListing._id}`), 1000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create listing');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="marketplace-page page">
      <h1>Create a New Listing</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Post items to buy, sell, rent, exchange, or giveaway with fellow campus students.
      </p>

      {errorMessage && (
        <div className="card" style={{ background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 16 }}>
          <p style={{ color: '#b91c1c' }}>{errorMessage}</p>
        </div>
      )}

      {toastMessage && (
        <div className="toast">
          ✓ {toastMessage}
        </div>
      )}

      <ListingForm
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
