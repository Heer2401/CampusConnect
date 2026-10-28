import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Sparkles, AlertTriangle, Clock, CheckCircle2, Info } from 'lucide-react';
import { listingsApi } from '../api/listingsApi';
import { ListingForm } from '../components/ListingForm';
import '../marketplace.css';

export const CreateListingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialValues = location.state?.initialValues || {};
  const fromRentalRequest = location.state?.fromRentalRequest;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);

  const handleCreate = async (formData, pendingFiles) => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');

      // 1. Create the listing
      const newListing = await listingsApi.createListing(formData);

      // 2. Upload images if provided
      let imageUploadWarning = '';
      if (pendingFiles && pendingFiles.length > 0) {
        try {
          await listingsApi.uploadImages(newListing._id, pendingFiles);
        } catch (imgError) {
          imageUploadWarning = 'Listing was created, but photos could not be processed. You can re-upload them anytime in Edit Listing.';
        }
      }

      let matchingResult = null;
      let matchingWarning = '';
      try {
        matchingResult = await listingsApi.evaluateWantedMatches(newListing._id);
      } catch (matchError) {
        matchingWarning = matchError.message || 'Wanted-post matching could not run right now.';
      }

      setSuccessData({
        listing: newListing,
        status: newListing.status || formData.status || 'active',
        imageWarning: imageUploadWarning,
        matching: matchingResult,
        matchingWarning,
      });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create listing. Please check required fields and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="marketplace-page page">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, margin: '0 0 6px 0', color: '#0f172a' }}>
          Create a New Listing
        </h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Post items to buy, sell, rent, exchange, or giveaway with fellow campus peers.
        </p>
      </div>

      {fromRentalRequest && (
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Sparkles size={20} style={{ color: '#4f46e5', flexShrink: 0 }} />
          <p style={{ margin: 0, color: '#3730a3', fontSize: 14 }}>
            <strong>Fulfilling Rental Request:</strong> Pre-filled for{' '}
            <strong>"{initialValues.title}"</strong>. The requesting peer will be notified once published!
          </p>
        </div>
      )}

      {errorMessage && (
        <div
          className="card"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderLeft: '4px solid #dc2626',
            marginBottom: 20,
            padding: '14px 18px',
          }}
        >
          <p style={{ color: '#b91c1c', margin: 0, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} /> {errorMessage}
          </p>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 12 }}>
            Your entered data has been preserved below. Please correct the highlighted errors and try again.
          </p>
        </div>
      )}

      <ListingForm
        initialValues={initialValues}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      {/* ── Submission Confirmation Modal ────────────────────────────────────── */}
      {successData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: 32,
              width: '100%',
              maxWidth: 500,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: successData.status === 'pending' ? '#fef3c7' : '#dcfce7',
                color: successData.status === 'pending' ? '#b45309' : '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                margin: '0 auto 16px auto',
              }}
            >
              {successData.status === 'pending' ? <Clock size={32} /> : <CheckCircle2 size={32} />}
            </div>

            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
              {successData.status === 'draft'
                ? 'Draft Saved Successfully!'
                : successData.status === 'pending'
                ? 'Listing Submitted for Review'
                : 'Listing Published Successfully!'}
            </h3>

            <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.5, margin: '0 0 20px 0' }}>
              {successData.status === 'draft' ? (
                <span>
                  Your listing draft for <b>"{successData.listing?.title}"</b> is saved in your account. You can complete and publish it anytime from your My Listings page.
                </span>
              ) : successData.status === 'pending' ? (
                <span>
                  Your listing for <b>"{successData.listing?.title}"</b> is in a moderated category and is currently awaiting a quick safety check by student moderators. It will appear publicly as soon as approved!
                </span>
              ) : (
                <span>
                  Your listing for <b>"{successData.listing?.title}"</b> is now live! Fellow campus peers can now discover, request, or purchase it on the marketplace.
                </span>
              )}
            </p>

            {successData.imageWarning && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 12,
                  color: '#92400e',
                  marginBottom: 16,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Info size={14} style={{ flexShrink: 0 }} />
                <span>{successData.imageWarning}</span>
              </div>
            )}

            {successData.matchingWarning && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 10, fontSize: 12, color: '#92400e', marginBottom: 16, textAlign: 'left' }}>
                {successData.matchingWarning}
              </div>
            )}
            {successData.matching?.deferred && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 10, fontSize: 12, color: '#1e40af', marginBottom: 16, textAlign: 'left' }}>
                Wanted-post matching will run after this listing is approved.
              </div>
            )}
            {successData.matching && !successData.matching.deferred && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 10, fontSize: 12, color: '#166534', marginBottom: 16, textAlign: 'left' }}>
                {successData.matching.matches?.length ? (
                  <>
                    <strong>{successData.matching.matches.length} wanted-post match{successData.matching.matches.length === 1 ? '' : 'es'} found.</strong>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                      {successData.matching.matches.slice(0, 5).map((match) => (
                        <li key={match.wanted_post_id}>{match.title} ({Math.round(match.similarity_score * 100)}% match)</li>
                      ))}
                    </ul>
                    <span>Matched students were notified.</span>
                  </>
                ) : successData.matching.open_wanted_post_count === 0
                  ? 'There are no open wanted posts to match against yet.'
                  : 'Matching checked open wanted posts. No matches were found.'}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate(`/marketplace/${successData.listing?._id}`)}
                style={{ width: '100%', padding: '12px 18px', fontSize: 15 }}
              >
                View Live Listing →
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSuccessData(null);
                    navigate('/marketplace/create', { state: {} });
                    window.location.reload();
                  }}
                  style={{ flex: 1, fontSize: 13 }}
                >
                  + Create Another
                </button>
                <Link
                  to="/my-listings"
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: 13, textAlign: 'center' }}
                >
                  My Listings Hub
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
