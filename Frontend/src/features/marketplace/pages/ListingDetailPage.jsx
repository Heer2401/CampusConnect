import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  Info,
  User,
  Camera,
  Shield,
  MapPin,
  Eye,
  Check,
  Star,
  GraduationCap,
  Lock,
  MessageSquare,
  Settings,
  Edit,
  Pause,
  ClipboardList,
  Trash2,
  Gift,
} from 'lucide-react';
import { listingsApi } from '../api/listingsApi';
import { useAuth } from '../hooks/useAuth';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import '../marketplace.css';
import { WishlistButton } from '../../search_communication/components/WishlistButton';
import { chatApi } from '../../search_communication/api/chatApi';
import { createTransaction, createRental } from '../../rental/api/rentalApi';

export const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [actionNoticeType, setActionNoticeType] = useState('info'); // 'info' | 'error'

  // ── Modal / action state ────────────────────────────────────────────────────
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showRentModal, setShowRentModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showGiveawayModal, setShowGiveawayModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [selectedExchangeListingId, setSelectedExchangeListingId] = useState('');
  const [rentalForm, setRentalForm] = useState({ startDate: '', dueDate: '', message: '' });

  // ── Notice helper ───────────────────────────────────────────────────────────
  const showNotice = (msg, type = 'info') => {
    setActionNotice(msg);
    setActionNoticeType(type);
    setTimeout(() => setActionNotice(''), 5000);
  };

  const fetchListing = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listingsApi.getListingById(id);
      setListing(data);
    } catch (err) {
      setError(err.message || 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListing();
  }, [id]);

  // Determine ownership safely
  const ownerId =
    listing?.owner?._id?.toString() ||
    listing?.owner?.id?.toString() ||
    (typeof listing?.owner === 'string' ? listing.owner : null);
  const currentUserId = user?._id?.toString() || user?.id?.toString();
  const isOwner = Boolean(ownerId && currentUserId && ownerId === currentUserId);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await listingsApi.deleteListing(id);
      setShowDeleteModal(false);
      navigate('/marketplace');
    } catch (err) {
      showNotice(err.message || 'Failed to delete listing', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setTogglingStatus(true);
      const isCurrentlyActive = listing.status === 'active' || listing.status === 'approved';
      const newStatus = isCurrentlyActive ? 'reserved' : 'active';
      const updated = await listingsApi.updateListing(listing._id, { status: newStatus });
      setListing((prev) => ({ ...prev, status: updated?.status || newStatus }));
      showNotice(
        `Listing marked as ${newStatus === 'active' ? 'Available' : 'Unavailable (Reserved)'}`,
        'info'
      );
    } catch (err) {
      showNotice(err.message || 'Failed to update listing status', 'error');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleContactSeller = async () => {
    try {
      if (!user) {
        showNotice('Please log in to chat with the seller');
        return;
      }
      if (isOwner) {
        showNotice('You are the owner of this listing');
        return;
      }
      const sellerId = listing.owner?._id || listing.owner?.id || listing.owner;
      const res = await chatApi.createOrGetThread(listing._id, sellerId);
      if (res.data?._id) navigate(`/chat?thread=${res.data._id}`);
    } catch (err) {
      showNotice(err.message || 'Could not initiate chat with seller', 'error');
    }
  };

  // ── Buy (sale) flow ─────────────────────────────────────────────────────────
  const handleBuyClick = () => {
    if (!user) {
      showNotice('Please log in to purchase items');
      return;
    }
    setShowBuyModal(true);
  };

  const handleBuyConfirm = async () => {
    try {
      setActionLoading(true);
      await createTransaction({ listingId: listing._id, type: 'sale' });
      navigate('/rentals', {
        state: {
          tab: 'Transactions',
          message:
            'Order initiated! Please coordinate with the seller in chat, and use the 6-digit Meetup PIN upon handover.',
        },
      });
    } catch (err) {
      showNotice(err.message || 'Failed to initiate purchase', 'error');
    } finally {
      setActionLoading(false);
      setShowBuyModal(false);
    }
  };

  // ── Rent flow ───────────────────────────────────────────────────────────────
  const handleRentClick = () => {
    if (!user) {
      showNotice('Please log in to request rentals');
      return;
    }
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setRentalForm({
      startDate: today.toISOString().slice(0, 10),
      dueDate: tomorrow.toISOString().slice(0, 10),
      message: '',
    });
    setShowRentModal(true);
  };

  const handleRentSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await createRental({ listingId: listing._id, ...rentalForm });
      navigate('/rentals', {
        state: {
          tab: 'Active Rentals',
          message: 'Rental requested! The owner has been notified.',
        },
      });
    } catch (err) {
      showNotice(err.message || 'Failed to request rental', 'error');
    } finally {
      setActionLoading(false);
      setShowRentModal(false);
    }
  };

  // ── Exchange flow ───────────────────────────────────────────────────────────
  const handleExchangeClick = async () => {
    if (!user) {
      showNotice('Please log in to offer an exchange');
      return;
    }
    setMyListingsLoading(true);
    setShowExchangeModal(true);
    try {
      const data = await listingsApi.getMyListings({ limit: 50 });
      const list = data?.data || data?.listings || (Array.isArray(data) ? data : []);
      // Exclude the current listing and filter out sold/rented/archived
      setMyListings(
        list.filter(
          (l) =>
            l._id !== listing._id &&
            !['sold', 'rented', 'exchanged', 'given_away', 'archived', 'rejected'].includes(l.status)
        )
      );
    } catch (_) {
      setMyListings([]);
    } finally {
      setMyListingsLoading(false);
    }
    setSelectedExchangeListingId('');
  };

  const handleExchangeConfirm = async () => {
    if (!selectedExchangeListingId) {
      showNotice('Please select one of your listings to offer');
      return;
    }
    try {
      setActionLoading(true);
      await createTransaction({
        listingId: listing._id,
        type: 'exchange',
        exchangeListingId: selectedExchangeListingId,
      });
      navigate('/rentals', {
        state: {
          tab: 'Transactions',
          message: 'Exchange offer submitted! Coordinate in chat and verify via 6-digit Meetup PIN.',
        },
      });
    } catch (err) {
      showNotice(err.message || 'Failed to offer exchange', 'error');
    } finally {
      setActionLoading(false);
      setShowExchangeModal(false);
    }
  };

  // ── Giveaway flow ───────────────────────────────────────────────────────────
  const handleGiveawayClick = () => {
    if (!user) {
      showNotice('Please log in to request this item');
      return;
    }
    setShowGiveawayModal(true);
  };

  const handleGiveawayConfirm = async () => {
    try {
      setActionLoading(true);
      await createTransaction({ listingId: listing._id, type: 'giveaway' });
      navigate('/rentals', {
        state: {
          tab: 'Transactions',
          message: 'Free item claimed! Coordinate meetup in chat and verify via 6-digit Meetup PIN.',
        },
      });
    } catch (err) {
      showNotice(err.message || 'Failed to claim item', 'error');
    } finally {
      setActionLoading(false);
      setShowGiveawayModal(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="marketplace-page page">
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: '#64748b' }}>
            <Clock size={32} />
          </div>
          <p style={{ fontWeight: 600, color: '#475569' }}>Loading listing details...</p>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="marketplace-page page">
        <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 480, margin: '40px auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: '#dc2626' }}>
            <AlertTriangle size={36} />
          </div>
          <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>{error || 'Listing not found'}</p>
          <Link to="/marketplace" className="btn btn-secondary">
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const images = listing.images || [];
  const activeImage = images[selectedImageIndex] || images[0];
  const isAvailable = listing.status === 'active' || listing.status === 'approved';

  // Seller profile info
  const sellerDisplayName =
    listing.owner?.profile?.name || listing.owner?.name || 'Campus Student';
  const sellerRating = listing.owner?.reputation?.rating;
  const sellerReviewsCount = listing.owner?.reputation?.reviewsCount || 0;
  const sellerProgram = listing.owner?.profile?.program;
  const sellerMemberSince = listing.owner?.createdAt
    ? new Date(listing.owner.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  // Primary Action Button Configuration based on listingType
  const getPrimaryActionConfig = () => {
    switch (listing.listingType) {
      case 'sell':
        return {
          label: `Buy / Start Purchase · ₹${listing.price}`,
          quickLabel: `Buy Now · ₹${listing.price}`,
          onClick: handleBuyClick,
          btnClass: 'btn btn-primary',
          style: { background: '#1d4ed8' },
        };
      case 'rent':
        return {
          label: `Request Rental (₹${listing.rentalRate}/${listing.rentalPeriod})`,
          quickLabel: `Request Rental · ₹${listing.rentalRate}/${listing.rentalPeriod}`,
          onClick: handleRentClick,
          btnClass: 'btn btn-primary',
          style: { background: '#166534' },
        };
      case 'exchange':
        return {
          label: 'Propose Exchange',
          quickLabel: 'Propose Exchange',
          onClick: handleExchangeClick,
          btnClass: 'btn btn-primary',
          style: { background: '#6b21a8' },
        };
      case 'giveaway':
        return {
          label: 'Request Item (Free)',
          quickLabel: 'Request Item (Free)',
          onClick: handleGiveawayClick,
          btnClass: 'btn btn-primary',
          style: { background: '#92400e' },
        };
      default:
        return {
          label: 'Contact Seller',
          quickLabel: 'Contact Seller',
          onClick: handleContactSeller,
          btnClass: 'btn btn-primary',
          style: {},
        };
    }
  };

  const primaryAction = getPrimaryActionConfig();

  // Secondary Action Label
  const secondaryActionLabel =
    listing.listingType === 'exchange' || listing.listingType === 'giveaway'
      ? 'Contact Owner'
      : 'Contact Seller';

  // Shared modal styles
  const backdropStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(3px)',
  };
  const modalStyle = {
    background: '#ffffff',
    borderRadius: 14,
    padding: 28,
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    position: 'relative',
  };

  return (
    <div className="marketplace-page page">
      {/* Notice Banner */}
      {actionNotice && (
        <div
          className="toast"
          style={{
            background: actionNoticeType === 'error' ? '#fef2f2' : undefined,
            borderColor: actionNoticeType === 'error' ? '#fca5a5' : undefined,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {actionNoticeType === 'error' ? <AlertTriangle size={15} /> : <Info size={15} />} {actionNotice}
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Link to="/marketplace" className="muted" style={{ textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
          ← Back to Marketplace
        </Link>
      </div>

      {/* Owner Notice Banner */}
      {isOwner && (
        <div
          className="card"
          style={{
            background: '#f0fdf4',
            marginBottom: 20,
            borderLeft: '4px solid #16a34a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={16} style={{ color: '#166534' }} />
              <b style={{ color: '#166534' }}>You are the owner of this listing</b>
              <StatusBadge status={listing.status} />
            </div>
            <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
              Buyers see your listing in browse mode. Use the owner management controls below to edit details or toggle availability.
            </p>
          </div>
          <Link
            to="/my-listings"
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
          >
            My Listings Hub →
          </Link>
        </div>
      )}

      {/* Non-Active Status Banner for Non-Owners */}
      {!isOwner && !isAvailable && (
        <div
          className="card"
          style={{
            background: '#fef3c7',
            marginBottom: 20,
            borderLeft: '4px solid #f59e0b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
          }}
        >
          <div>
            <b>Status: <StatusBadge status={listing.status} /></b>
            <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
              This item is currently marked as <b>{listing.status}</b> and may no longer be available for purchase.
            </p>
          </div>
        </div>
      )}

      {/* Consistent 2-Column Layout: Left Image Gallery, Right Listing Info */}
      <div className="listing-detail-layout">
        {/* ── Left Column: Media Gallery & Handover Safety ──────────────────────── */}
        <div className="listing-media-column">
          <div className="listing-main-image-frame">
            {activeImage?.url ? (
              <>
                <img
                  src={activeImage.url}
                  alt={listing.title}
                />
                {images.length > 1 && (
                  <span className="listing-image-counter" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Camera size={13} /> {selectedImageIndex + 1} of {images.length}
                  </span>
                )}
              </>
            ) : (
              <div className="listing-image-placeholder">
                <div className="placeholder-icon-circle">
                  <Camera size={32} />
                </div>
                <span className="placeholder-badge">No Photos Uploaded</span>
                <h4>No Images Provided</h4>
                <p>
                  The seller hasn't uploaded photos for this item. Check description details and request photos via campus chat.
                </p>
              </div>
            )}
          </div>

          {/* Thumbnail Gallery Strip */}
          {images.length > 1 && (
            <div className="listing-thumbnail-strip">
              {images.map((img, idx) => (
                <div
                  key={img._id || img.key || idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`listing-thumbnail-item ${selectedImageIndex === idx ? 'active' : ''}`}
                >
                  <img
                    src={img.thumbnailUrl || img.url}
                    alt={`Thumbnail ${idx + 1}`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Reassurance & Campus Safety Card */}
          <div className="listing-safety-box">
            <span className="listing-safety-icon"><Shield size={20} /></span>
            <div className="listing-safety-content">
              <h5>Safe Campus Exchange</h5>
              <p>
                Always meet counterparties in public campus spots such as the Central Library foyer or Main Cafeteria. Inspect condition thoroughly before completing the 6-digit Meetup PIN handover.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Column: Listing Details & Primary Actions ────────────────────── */}
        <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column' }}>
          {/* Header row: category, status, title, wishlist */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span className="pill pill-blue">
                  {listing.category?.name || 'Campus Item'}
                </span>
                <span className={`pill ${listing.listingType === 'rent' ? 'pill-green' : listing.listingType === 'exchange' ? 'pill-purple' : listing.listingType === 'giveaway' ? 'pill-yellow' : 'pill-gray'}`}>
                  {listing.listingType?.toUpperCase()}
                </span>
              </div>
              <h1 style={{ fontSize: 26, margin: '6px 0 0 0', lineHeight: 1.25, color: '#0f172a' }}>
                {listing.title}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WishlistButton listingId={listing._id} showLabel={false} />
              <StatusBadge status={listing.status} />
            </div>
          </div>

          {/* Pricing & Clear Primary Action Near Price */}
          <div className="listing-price-action-banner">
            <div className="listing-price-info">
              {listing.listingType === 'sell' && (
                <>
                  <div className="listing-price-main" style={{ color: '#1d4ed8' }}>
                    <span>₹{listing.price}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>Fixed Price</span>
                  </div>
                  <span className="listing-price-sub">Direct campus purchase</span>
                </>
              )}
              {listing.listingType === 'rent' && (
                <>
                  <div className="listing-price-main" style={{ color: '#166534' }}>
                    <span>₹{listing.rentalRate}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>/{listing.rentalPeriod || 'week'}</span>
                  </div>
                  <span className="listing-price-sub">
                    {listing.deposit ? `Refundable deposit: ₹${listing.deposit}` : 'No deposit required'}
                  </span>
                </>
              )}
              {listing.listingType === 'exchange' && (
                <>
                  <div className="listing-price-main" style={{ color: '#6b21a8', fontSize: 22 }}>
                    <span>Item Trade</span>
                  </div>
                  <span className="listing-price-sub">
                    Owner seeks: <b>{listing.exchangeFor}</b>
                  </span>
                </>
              )}
              {listing.listingType === 'giveaway' && (
                <>
                  <div className="listing-price-main" style={{ color: '#92400e' }}>
                    <span>Free Giveaway</span>
                  </div>
                  <span className="listing-price-sub">₹0 · Free community gift</span>
                </>
              )}
            </div>

            {/* Quick Primary Action Near Price (Hidden for Listing Owner) */}
            {!isOwner && isAvailable && (
              <button
                type="button"
                className={`btn-quick-primary ${primaryAction.btnClass}`}
                style={primaryAction.style}
                onClick={primaryAction.onClick}
              >
                {primaryAction.quickLabel}
              </button>
            )}
          </div>

          {/* Key Attributes Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 14,
              padding: '16px 0',
              borderTop: '1px solid #f1f5f9',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div>
              <span className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Condition</span>
              <p style={{ fontWeight: 600, margin: '4px 0 0 0', textTransform: 'capitalize', color: '#1e293b' }}>
                {listing.condition?.replace('_', ' ') || 'Good'}
              </p>
            </div>
            <div>
              <span className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quantity</span>
              <p style={{ fontWeight: 600, margin: '4px 0 0 0', color: '#1e293b' }}>
                {listing.quantity || 1} available
              </p>
            </div>
            {listing.pickupLocation && (
              <div style={{ gridColumn: 'span 2' }}>
                <span className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Campus Pickup Spot</span>
                <p style={{ fontWeight: 600, margin: '4px 0 0 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={15} style={{ color: '#2563eb', flexShrink: 0 }} /> {listing.pickupLocation}
                </p>
              </div>
            )}
            <div>
              <span className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Views</span>
              <p style={{ fontWeight: 600, margin: '4px 0 0 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={15} style={{ color: '#64748b', flexShrink: 0 }} /> {listing.viewCount || 0} campus views
              </p>
            </div>
            <div>
              <span className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Listed Date</span>
              <p style={{ fontWeight: 600, margin: '4px 0 0 0', color: '#1e293b' }}>
                {new Date(listing.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Description Section */}
          <div style={{ marginTop: 18 }}>
            <span className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Item Description</span>
            <p style={{ marginTop: 8, lineHeight: 1.65, whiteSpace: 'pre-line', color: '#334155', fontSize: 14 }}>
              {listing.description || 'No additional description provided.'}
            </p>
          </div>

          {/* Tags */}
          {listing.tags && listing.tags.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {listing.tags.map((t) => (
                <span key={t} className="chip-tag">#{t}</span>
              ))}
            </div>
          )}

          {/* ── Seller Information Card (Non-Generic, Privacy-Preserving) ───────── */}
          <div className="listing-seller-card">
            <div className="seller-profile-row">
              <div className="seller-avatar">
                {listing.owner?.avatar ? (
                  <img src={listing.owner.avatar} alt={sellerDisplayName} />
                ) : (
                  sellerDisplayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="seller-details">
                <div className="seller-name-row">
                  <span className="seller-display-name">{sellerDisplayName}</span>
                  {listing.owner?.isVerified !== false && (
                    <span className="seller-verified-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Check size={11} /> Verified Student
                    </span>
                  )}
                </div>
                <div className="seller-meta-row">
                  <span className="seller-rating" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Star size={12} fill="#f59e0b" color="#f59e0b" /> {sellerRating ? sellerRating.toFixed(1) : '5.0'}
                    <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 2 }}>
                      ({sellerReviewsCount} {sellerReviewsCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </span>
                  {sellerMemberSince && (
                    <span>• Member since {sellerMemberSince}</span>
                  )}
                </div>
                {sellerProgram && (
                  <div className="seller-academic-row" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <GraduationCap size={14} /> {sellerProgram}
                  </div>
                )}
              </div>
            </div>
            <div className="seller-privacy-note" style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <Lock size={13} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Counterparty privacy protected: Personal contact information is kept private. Chat securely inside CampusConnect.
              </span>
            </div>

            {/* Horizontal Full-Width Contact Button for Non-Owners */}
            {!isOwner && isAvailable && (
              <button
                type="button"
                className="btn btn-secondary btn-seller-contact"
                onClick={handleContactSeller}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <MessageSquare size={16} /> {secondaryActionLabel}
              </button>
            )}
          </div>

          {/* ── Action Section: Owner View & Unavailable Notice ─────────────────── */}
          {isOwner && (
            <div style={{ marginTop: 'auto', paddingTop: 8 }}>
              {/* Owner Management Controls */}
              <div className="listing-owner-panel">
                <div className="owner-panel-header">
                  <span className="owner-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Settings size={13} /> Owner Controls
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Listing is currently <b>{listing.status}</b>
                  </span>
                </div>
                <div className="owner-actions-grid">
                  <Link
                    to={`/marketplace/edit/${listing._id}`}
                    className="btn-owner-action btn-owner-edit"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Edit size={14} /> Edit Listing
                  </Link>

                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    disabled={togglingStatus}
                    className="btn-owner-action btn-owner-toggle"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    {togglingStatus ? (
                      'Updating...'
                    ) : isAvailable ? (
                      <>
                        <Pause size={14} /> Mark Unavailable
                      </>
                    ) : (
                      'Mark Available'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate('/rentals', { state: { tab: 'Transactions' } })
                    }
                    className="btn-owner-action btn-owner-trans"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <ClipboardList size={14} /> View Transactions
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="btn-owner-action btn-owner-delete"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Trash2 size={14} /> Delete Listing
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isOwner && !isAvailable && (
            <div style={{ marginTop: 12, width: '100%', textAlign: 'center', padding: '12px 16px', background: '#f1f5f9', borderRadius: 8, color: '#64748b', fontWeight: 600 }}>
              This item is no longer available for purchase or requests.
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ─────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        title="Delete Listing"
        message="Are you sure you want to delete this listing? It will be removed permanently from the campus marketplace."
        confirmText={isDeleting ? 'Deleting...' : 'Delete Listing'}
        isDanger={true}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* ── Buy Modal ─────────────────────────────────────────────────────────── */}
      {showBuyModal && (
        <div style={backdropStyle} onClick={() => setShowBuyModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 20 }}>Confirm Campus Purchase</h3>
            <p className="muted" style={{ marginBottom: 20, lineHeight: 1.5, fontSize: 14 }}>
              You are about to start purchase of <b>{listing.title}</b> for <b>₹{listing.price}</b>.
              The item will be marked as reserved for you. Use the in-app chat to arrange meetup and swap your 6-digit PIN upon item receipt.
            </p>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 20, fontSize: 14, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="muted">Item</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{listing.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="muted">Seller</span>
                <span>{sellerDisplayName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 4 }}>
                <span style={{ fontWeight: 700 }}>Total Agreed</span>
                <span style={{ fontWeight: 800, color: '#1d4ed8', fontSize: 20 }}>₹{listing.price}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowBuyModal(false)} disabled={actionLoading}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1.2 }} onClick={handleBuyConfirm} disabled={actionLoading}>
                {actionLoading ? 'Initiating...' : `Confirm Purchase · ₹${listing.price}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rent Modal ────────────────────────────────────────────────────────── */}
      {showRentModal && (
        <div style={backdropStyle} onClick={() => setShowRentModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 20 }}>Request Rental</h3>
            <p className="muted" style={{ marginBottom: 20, fontSize: 14 }}>
              {listing.title} · ₹{listing.rentalRate}/{listing.rentalPeriod}
              {listing.deposit ? ` · Deposit: ₹${listing.deposit}` : ''}
            </p>
            <form onSubmit={handleRentSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Rental Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={rentalForm.startDate}
                    onChange={(e) => setRentalForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Return Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={rentalForm.startDate || new Date().toISOString().slice(0, 10)}
                    value={rentalForm.dueDate}
                    onChange={(e) => setRentalForm((f) => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  Message to Owner (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="E.g. I need this lab equipment for my lab test this Thursday..."
                  value={rentalForm.message}
                  onChange={(e) => setRentalForm((f) => ({ ...f, message: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowRentModal(false)} disabled={actionLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1.2, background: '#166534' }} disabled={actionLoading}>
                  {actionLoading ? 'Submitting...' : 'Send Rental Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Exchange Modal ────────────────────────────────────────────────────── */}
      {showExchangeModal && (
        <div style={backdropStyle} onClick={() => setShowExchangeModal(false)}>
          <div style={{ ...modalStyle, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 20 }}>Propose Exchange</h3>
            <p className="muted" style={{ marginBottom: 4, fontSize: 14 }}>
              The owner seeks: <b style={{ color: '#6b21a8' }}>{listing.exchangeFor}</b>
            </p>
            <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
              Select one of your active listings to offer in trade:
            </p>

            {myListingsLoading ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Loading your listings…</div>
            ) : myListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, background: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
                <p style={{ color: '#64748b' }}>You have no active listings available to offer for trade.</p>
                <Link
                  to="/marketplace/create"
                  className="btn btn-secondary"
                  style={{ marginTop: 10, display: 'inline-block' }}
                  onClick={() => setShowExchangeModal(false)}
                >
                  Create a Listing First
                </Link>
              </div>
            ) : (
              <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myListings.map((l) => (
                  <label
                    key={l._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      borderRadius: 8,
                      border: selectedExchangeListingId === l._id ? '2px solid #6b21a8' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      background: selectedExchangeListingId === l._id ? '#faf5ff' : '#ffffff',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="exchangeListing"
                      value={l._id}
                      checked={selectedExchangeListingId === l._id}
                      onChange={() => setSelectedExchangeListingId(l._id)}
                      style={{ accentColor: '#6b21a8' }}
                    />
                    {l.images?.[0]?.url && (
                      <img
                        src={l.images[0].thumbnailUrl || l.images[0].url}
                        alt={l.title}
                        style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.title}
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {l.listingType === 'sell' ? `₹${l.price}` : l.listingType} · {l.condition?.replace('_', ' ')}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowExchangeModal(false)} disabled={actionLoading}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1.2, background: '#6b21a8' }}
                onClick={handleExchangeConfirm}
                disabled={actionLoading || !selectedExchangeListingId || myListingsLoading}
              >
                {actionLoading ? 'Submitting...' : 'Propose Exchange'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Giveaway Modal ────────────────────────────────────────────────────── */}
      {showGiveawayModal && (
        <div style={backdropStyle} onClick={() => setShowGiveawayModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 20 }}>Request Free Item</h3>
            <p className="muted" style={{ marginBottom: 20, lineHeight: 1.5, fontSize: 14 }}>
              You are requesting <b>{listing.title}</b> for free.
              Coordinate with <b>{sellerDisplayName}</b> for campus pickup.
              The listing will be reserved for you.
            </p>
            <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Gift size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>This is a campus giveaway. Be a supportive campus peer — only request items you genuinely have a use for.</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowGiveawayModal(false)} disabled={actionLoading}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1.2, background: '#92400e' }}
                onClick={handleGiveawayConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? 'Requesting...' : 'Request Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
