import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listingsApi } from '../api/listingsApi';
import { ListingForm } from '../components/ListingForm';

export const EditListingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const fetchListing = async () => {
    try {
      setLoading(true);
      const data = await listingsApi.getListingById(id);
      setListing(data);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load listing for editing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListing();
  }, [id]);

  const handleUpdate = async (formData, pendingFiles) => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');

      // 1. Update listing details
      await listingsApi.updateListing(id, formData);

      // 2. Upload any new photos
      if (pendingFiles && pendingFiles.length > 0) {
        await listingsApi.uploadImages(id, pendingFiles);
      }

      setToastMessage('Listing updated successfully!');
      setTimeout(() => navigate(`/listings/${id}`), 1000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update listing');
      setIsSubmitting(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      const updatedImages = await listingsApi.deleteImage(id, imageId);
      setListing(prev => ({ ...prev, images: updatedImages }));
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete photo');
    }
  };

  const handleSetPrimaryImage = async (primaryImageId) => {
    try {
      const updatedImages = await listingsApi.reorderImages(id, { primaryImageId });
      setListing(prev => ({ ...prev, images: updatedImages }));
    } catch (err) {
      setErrorMessage(err.message || 'Failed to set primary photo');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          Loading listing details...
        </div>
      </div>
    );
  }

  if (errorMessage && !listing) {
    return (
      <div className="page">
        <div className="card" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p style={{ color: '#b91c1c' }}>{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Edit Listing</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Update listing details, pricing, conditions, or photos.
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
        initialValues={listing}
        existingImages={listing?.images || []}
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
        onDeleteExistingImage={handleDeleteImage}
        onSetPrimaryExistingImage={handleSetPrimaryImage}
      />
    </div>
  );
};
