import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
import { listingsApi } from '../api/listingsApi';
import { ListingForm } from '../components/ListingForm';
import '../marketplace.css';
import '../CreateListing.css';

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
      setTimeout(() => navigate(`/marketplace/${id}`), 1000);
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
      <div className="marketplace-page create-listing-page">
        <div className="create-listing-container">
          <div className="create-card" style={{ padding: 40, textAlign: 'center' }}>
            Loading listing details...
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage && !listing) {
    return (
      <div className="marketplace-page create-listing-page">
        <div className="create-listing-container">
          <div className="create-card" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p style={{ color: '#b91c1c', margin: 0 }}>{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-page create-listing-page">
      <div className="create-listing-container">
        <div className="create-listing-header">
          <div className="create-listing-header-left">
            <span className="create-listing-eyebrow">EDIT LISTING</span>
            <h1 className="create-listing-title">Edit Your Listing</h1>
            <p className="create-listing-subtitle">
              Update photos, item details, terms, and publishing preferences.
            </p>
          </div>
          <Link to={`/marketplace/${id}`} className="btn-back-marketplace">
            <ArrowLeft size={16} /> Back to Listing
          </Link>
        </div>

        {errorMessage && (
          <div className="create-card" style={{ background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 16 }}>
            <p style={{ color: '#b91c1c', margin: 0 }}>{errorMessage}</p>
          </div>
        )}

        {toastMessage && (
          <div className="toast" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <Check size={16} /> {toastMessage}
          </div>
        )}

        <ListingForm
          initialValues={listing}
          existingImages={listing?.images || []}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          onDeleteExistingImage={handleDeleteImage}
          onSetPrimaryExistingImage={handleSetPrimaryImage}
          isEditMode={true}
        />
      </div>
    </div>
  );
};
