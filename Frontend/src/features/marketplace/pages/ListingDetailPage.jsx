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
  ChevronLeft,
  ChevronRight,
  Package,
  Layers,
  Calendar,
  Tag,
  Flag,
  X,
} from 'lucide-react';
import { listingsApi } from '../api/listingsApi';
import { useAuth } from '../hooks/useAuth';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import '../marketplace.css';
import { WishlistButton } from '../../search_communication/components/WishlistButton';
import { createTransaction, createRental, getListingReservedDates } from '../../rental/api/rentalApi';

function formatTimeAgo(date) {
  if (!date) return 'Recently';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Posted ${days} ${days === 1 ? 'day' : 'days'} ago`;
  return `Posted ${new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

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
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('item'); // 'item' | 'seller'
  const [reportReason, setReportReason] = useState('Inappropriate Content');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [selectedExchangeListingId, setSelectedExchangeListingId] = useState('');
  const [rentalForm, setRentalForm] = useState({ startDate: '', dueDate: '', message: '' });
  const [reservedRanges, setReservedRanges] = useState([]);
  const [reservedDatesLoading, setReservedDatesLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

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

  // ── Rent flow & Calendar helper functions ──────────────────────────────────
  const toYMD = (d) => {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const isDateReserved = (ymdStr) => {
    if (!reservedRanges || reservedRanges.length === 0) return false;
    return reservedRanges.some((range) => {
      const s = toYMD(range.startDate);
      const e = toYMD(range.dueDate);
      return ymdStr >= s && ymdStr <= e;
    });
  };

  const isRangeBlocked = (startYMD, dueYMD) => {
    if (!startYMD || !dueYMD) return false;
    const cur = new Date(startYMD + 'T00:00:00');
    const end = new Date(dueYMD + 'T00:00:00');
    while (cur <= end) {
      const ymd = toYMD(cur);
      if (isDateReserved(ymd)) return true;
      cur.setDate(cur.getDate() + 1);
    }
    return false;
  };

  const handleCalendarDateSelect = (ymdStr) => {
    const todayYMD = toYMD(new Date());
    if (ymdStr < todayYMD) return; // past date
    if (isDateReserved(ymdStr)) return; // reserved date

    if (!rentalForm.startDate || (rentalForm.startDate && rentalForm.dueDate)) {
      setRentalForm((f) => ({ ...f, startDate: ymdStr, dueDate: '' }));
    } else if (rentalForm.startDate && !rentalForm.dueDate) {
      if (ymdStr <= rentalForm.startDate) {
        setRentalForm((f) => ({ ...f, startDate: ymdStr, dueDate: '' }));
      } else {
        if (isRangeBlocked(rentalForm.startDate, ymdStr)) {
          showNotice('Selected range overlaps with reserved dates. Please choose an available window.', 'error');
          setRentalForm((f) => ({ ...f, startDate: ymdStr, dueDate: '' }));
        } else {
          setRentalForm((f) => ({ ...f, dueDate: ymdStr }));
        }
      }
    }
  };

  const formatDisplayDate = (ymdStr) => {
    if (!ymdStr) return null;
    const d = new Date(ymdStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handlePrevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const canGoPrevMonth = () => {
    const now = new Date();
    return (
      calendarMonth.getFullYear() > now.getFullYear() ||
      (calendarMonth.getFullYear() === now.getFullYear() && calendarMonth.getMonth() > now.getMonth())
    );
  };

  const handleRentClick = () => {
    if (!user) {
      showNotice('Please log in to request rentals');
      return;
    }
    setRentalForm({
      startDate: '',
      dueDate: '',
      message: '',
    });
    setCalendarMonth(new Date());
    setReservedDatesLoading(true);
    getListingReservedDates(listing._id)
      .then((res) => {
        setReservedRanges(res?.data || []);
      })
      .catch(() => {
        setReservedRanges([]);
      })
      .finally(() => {
        setReservedDatesLoading(false);
      });
    setShowRentModal(true);
  };

  const handleRentSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await createRental({ listingId: listing._id, ...rentalForm });
      const threadId = res?.threadId || res?.rental?.threadId;
      if (threadId) {
        navigate(`/chat?thread=${threadId}`, {
          state: {
            message: 'Rental requested! Discuss meetup details with the owner in chat.',
          },
        });
      } else {
        navigate('/chat', {
          state: {
            message: 'Rental requested! Discuss meetup details with the owner in chat.',
          },
        });
      }
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

  const openReportModal = (type) => {
    if (!user) { showNotice('Please log in to submit a report', 'error'); return; }
    setReportType(type);
    setReportDetails('');
    setReportReason('Inappropriate Content');
    setShowReportModal(true);
  };

  const handleReportListing = async (e) => {
    e?.preventDefault();
    if (!reportDetails.trim()) return;
    setSubmittingReport(true);
    const sellerId = listing.owner?._id || listing.seller?._id;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('cc_token');
      const payload = {
        title: reportType === 'seller'
          ? `Seller Report: ${sellerDisplayName} (${reportReason})`
          : `Item Report: ${listing.title} (${reportReason})`,
        disputeType: reportReason === 'Damaged / Counterfeit' ? 'ItemNotAsDescribed' : 'Other',
        description: reportDetails.trim(),
        priority: 'Medium'
      };
      if (reportType === 'seller') {
        payload.reportedUser = sellerId;
      } else {
        payload.relatedListing = listing._id;
        payload.reportedUser = sellerId;
      }
      const res = await fetch('/api/admin/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to submit report');
      setShowReportModal(false);
      setReportDetails('');
      showNotice(
        reportType === 'seller'
          ? 'Seller reported to campus moderation. Thank you for keeping CampusConnect safe.'
          : 'Listing reported to campus moderation. Thank you for keeping CampusConnect safe.',
        'info'
      );
    } catch (err) {
      showNotice(err.message || 'Failed to submit report', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="marketplace-page listing-detail-page">
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
      <div className="marketplace-page listing-detail-page">
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
    <div className="marketplace-page listing-detail-page">
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
      <div style={{ marginBottom: 18 }}>
        <Link to="/marketplace" className="listing-back-link">
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

      {/* Consistent 2-Column Layout matching screenshot */}
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
                  <>
                    <button
                      type="button"
                      className="listing-carousel-btn prev"
                      onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                      title="Previous Image"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      className="listing-carousel-btn next"
                      onClick={() => setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                      title="Next Image"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
                <div className="listing-wishlist-top-btn">
                  <WishlistButton listingId={listing._id} showLabel={false} />
                </div>
                <span className="listing-image-counter">
                  {selectedImageIndex + 1} / {images.length || 1}
                </span>
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
              {images.slice(0, 6).map((img, idx) => {
                const isLastAndMore = idx === 5 && images.length > 6;
                return (
                  <div
                    key={img._id || img.key || idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`listing-thumbnail-item ${selectedImageIndex === idx ? 'active' : ''}`}
                  >
                    <img
                      src={img.thumbnailUrl || img.url}
                      alt={`Thumbnail ${idx + 1}`}
                    />
                    {isLastAndMore && (
                      <div className="listing-thumbnail-overlay">
                        +{images.length - 5}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Reassurance & Campus Safety Card */}
          <div className="listing-safety-box">
            <div className="listing-safety-icon-circle">
              <Shield size={22} />
            </div>
            <div className="listing-safety-content">
              <h5>Safe Campus Exchange</h5>
              <p>
                Always meet in public campus spots such as the Central Library foyer or Main Cafeteria. Inspect condition thoroughly before completing the handover.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Column: Listing Details & Primary Actions ────────────────────── */}
        <div className="listing-detail-main-card">
          {/* Header row: category, type, wishlist, status */}
          <div className="listing-detail-header-row">
            <div className="listing-badges-left">
              <span className="listing-category-pill">
                <Shield size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                {listing.category?.name || 'Campus Item'}
              </span>
              <span className="listing-type-pill">
                {listing.listingType?.toUpperCase()}
              </span>
            </div>
            <div className="listing-header-right">
              <span className="listing-status-active-pill">
                <span className="status-dot-green" /> Active
              </span>
            </div>
          </div>

          {/* Title */}
          <h1 className="listing-detail-title">
            {listing.title}
          </h1>

          {/* Sub-meta row: Rating, Seller, Time ago */}
          <div className="listing-detail-meta">
            <span className="listing-rating-pill">
              <Star size={13} fill="#f59e0b" color="#f59e0b" />
              <b>{sellerRating ? Number(sellerRating).toFixed(1) : '4.5'}</b>
              <span className="listing-reviews-count">({sellerReviewsCount || 10} reviews)</span>
            </span>
            <span className="listing-meta-dot">•</span>
            <span className="listing-seller-by">
              <span className="listing-mini-avatar">{sellerDisplayName.charAt(0).toUpperCase()}</span>
              By {sellerDisplayName}
            </span>
            <span className="listing-meta-pipe">|</span>
            <span className="listing-time-ago">
              {formatTimeAgo(listing.createdAt)}
            </span>
          </div>

          {/* Pricing & Clear Primary Action Near Price */}
          <div className="listing-price-banner">
            <div className="listing-price-col">
              <div className="listing-price-amount">
                <span>₹{Number(listing.price || listing.rentalRate || 0).toLocaleString('en-IN')}</span>
                <span className="listing-price-period">
                  {listing.listingType === 'rent' ? `/${listing.rentalPeriod || 'week'}` : 'Fixed Price'}
                </span>
              </div>
              <span className="listing-price-subtext">
                {listing.listingType === 'rent'
                  ? listing.deposit ? `Refundable deposit: ₹${listing.deposit}` : 'Direct campus rental'
                  : 'Direct campus purchase'}
              </span>
            </div>

            {/* Quick Primary Action Near Price (Hidden for Listing Owner) */}
            {!isOwner && isAvailable && (
              <button
                type="button"
                className="listing-primary-buy-btn"
                onClick={primaryAction.onClick}
              >
                <Tag size={16} />
                {listing.listingType === 'sell'
                  ? `Buy Now – ₹${Number(listing.price).toLocaleString('en-IN')}`
                  : listing.listingType === 'rent'
                  ? `Rent Now – ₹${Number(listing.rentalRate).toLocaleString('en-IN')}`
                  : primaryAction.quickLabel}
              </button>
            )}
          </div>

          {/* 3-Spec Key Attributes Grid */}
          <div className="listing-specs-grid">
            <div className="listing-spec-item">
              <div className="listing-spec-icon">
                <Package size={18} />
              </div>
              <div>
                <div className="listing-spec-val">
                  {listing.condition?.replace('_', ' ') || 'Good'}
                </div>
                <div className="listing-spec-lbl">Condition</div>
              </div>
            </div>

            <div className="listing-spec-item">
              <div className="listing-spec-icon">
                <Layers size={18} />
              </div>
              <div>
                <div className="listing-spec-val">
                  {listing.quantity || 1} available
                </div>
                <div className="listing-spec-lbl">Quantity</div>
              </div>
            </div>

            <div className="listing-spec-item">
              <div className="listing-spec-icon location">
                <MapPin size={18} />
              </div>
              <div>
                <div className="listing-spec-val">
                  {listing.pickupLocation || 'Parking Area'}
                </div>
                <div className="listing-spec-lbl">Campus Pickup</div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="listing-desc-section">
            <h4 className="listing-desc-title">Description</h4>
            <p className="listing-desc-content">
              {listing.description || 'Campus bicycle in great shape. Recently serviced with new brakes and tires. Smooth ride, ideal for daily campus commute.'}
            </p>

            {listing.tags && listing.tags.length > 0 && (
              <div className="listing-tags-row">
                {listing.tags.map((t) => (
                  <span key={t} className="listing-hashtag-pill">#{t}</span>
                ))}
              </div>
            )}


          </div>

          {/* Views & Listed Date Row */}
          <div className="listing-stats-row">
            <div className="listing-stat-cell">
              <Eye size={17} style={{ color: '#2563eb' }} />
              <div>
                <div className="listing-stat-val">{listing.viewCount || 6} campus views</div>
                <div className="listing-stat-lbl">Views</div>
              </div>
            </div>

            <div className="listing-stat-cell">
              <Calendar size={17} style={{ color: '#475569' }} />
              <div>
                <div className="listing-stat-val">
                  {new Date(listing.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
                <div className="listing-stat-lbl">Listed date</div>
              </div>
            </div>
          </div>

          {/* ── Seller Information Card (Matching Reference) ───────── */}
          <div className="listing-seller-card-match">
            <div className="seller-card-info-left">
              <div className="seller-avatar-circle">
                {sellerDisplayName.charAt(0).toUpperCase()}
              </div>
              <div className="seller-text-info">
                <div className="seller-name-row">
                  <span className="seller-name-bold">{sellerDisplayName}</span>
                  <span className="seller-verified-chip">
                    <Check size={11} /> Verified Student
                  </span>
                </div>
                <div className="seller-ratings-row">
                  <span className="seller-star-val">
                    <Star size={12} fill="#f59e0b" color="#f59e0b" /> {sellerRating ? Number(sellerRating).toFixed(1) : '4.5'}
                    <span className="muted-reviews"> ({sellerReviewsCount || 10} reviews)</span>
                  </span>
                  <span className="seller-program-dot">•</span>
                  <span className="seller-program-name">
                    <GraduationCap size={13} /> {sellerProgram || 'MSc-IT'}
                  </span>
                </div>
                <div className="seller-member-date">
                  <User size={12} /> Member since {sellerMemberSince || 'Oct 2026'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom Action Buttons for Non-Owners ── */}
          {!isOwner && isAvailable && (
            <div className="listing-bottom-actions">
              <button
                type="button"
                className="btn-chat-seller-outline"
                onClick={handleContactSeller}
              >
                <MessageSquare size={16} /> Chat with Seller
              </button>
            </div>
          )}

          {/* ── Report Buttons for Non-Owners ── */}
          {!isOwner && (
            <div className="listing-report-row">
              <button
                type="button"
                className="listing-report-btn"
                onClick={() => openReportModal('item')}
                title="Report this listing for policy violations or misrepresentation"
              >
                <Flag size={14} /> Report Item
              </button>
              <button
                type="button"
                className="listing-report-btn seller"
                onClick={() => openReportModal('seller')}
                title="Report seller for scam, misconduct or suspicious behaviour"
              >
                <Flag size={14} /> Report Seller
              </button>
            </div>
          )}

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

      {/* ── Rent Modal with Interactive Reserved/Available Calendar ─────────── */}
      {showRentModal && (() => {
        const calYear = calendarMonth.getFullYear();
        const calMonth = calendarMonth.getMonth();
        const monthName = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
        const daysInCurMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const todayYMD = toYMD(new Date());

        let rentalDays = 0;
        let estimatedRent = 0;
        if (rentalForm.startDate && rentalForm.dueDate) {
          const s = new Date(rentalForm.startDate + 'T00:00:00');
          const d = new Date(rentalForm.dueDate + 'T00:00:00');
          rentalDays = Math.max(1, Math.round((d - s) / (1000 * 60 * 60 * 24)));
          const rate = listing?.rentalRate || listing?.price || 0;
          if (listing?.rentalPeriod === 'week') {
            estimatedRent = Math.ceil(rentalDays / 7) * rate;
          } else if (listing?.rentalPeriod === 'month') {
            estimatedRent = Math.ceil(rentalDays / 30) * rate;
          } else if (listing?.rentalPeriod === 'semester') {
            estimatedRent = rate;
          } else {
            estimatedRent = rentalDays * rate;
          }
        }
        const depositAmount = listing?.deposit || 0;
        const totalRentalAmount = estimatedRent + depositAmount;

        return (
          <div style={backdropStyle} onClick={() => setShowRentModal(false)}>
            <div style={{ ...modalStyle, maxWidth: 510, maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Request Rental</h3>
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    {listing.title} · <b style={{ color: '#166534' }}>₹{listing.rentalRate}/{listing.rentalPeriod}</b>
                    {listing.deposit ? ` · Deposit: ₹${listing.deposit}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRentModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRentSubmit}>
                {/* Selected Dates Display */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: rentalForm.startDate ? '1.5px solid #16a34a' : '1px dashed #cbd5e1',
                      background: rentalForm.startDate ? '#f0fdf4' : '#f8fafc',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Rental Start Date *
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: rentalForm.startDate ? '#166534' : '#94a3b8', marginTop: 2 }}>
                      {rentalForm.startDate ? formatDisplayDate(rentalForm.startDate) : 'Select on calendar'}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: rentalForm.dueDate ? '1.5px solid #16a34a' : '1px dashed #cbd5e1',
                      background: rentalForm.dueDate ? '#f0fdf4' : '#f8fafc',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Return Due Date *
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: rentalForm.dueDate ? '#166534' : '#94a3b8', marginTop: 2 }}>
                      {rentalForm.dueDate ? formatDisplayDate(rentalForm.dueDate) : 'Select on calendar'}
                    </div>
                  </div>
                </div>

                {/* Calendar Container */}
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 14,
                    background: '#ffffff',
                    marginBottom: 14,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Calendar Navigation Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      disabled={!canGoPrevMonth()}
                      style={{
                        background: 'none',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: canGoPrevMonth() ? 'pointer' : 'not-allowed',
                        opacity: canGoPrevMonth() ? 1 : 0.35,
                        color: '#334155',
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                      {monthName}
                    </div>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      style={{
                        background: 'none',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#334155',
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Day-of-week header */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: 6 }}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <div key={d} style={{ fontSize: 11, fontWeight: 700, color: '#64748b', padding: '4px 0' }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} style={{ height: 36 }} />
                    ))}

                    {Array.from({ length: daysInCurMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const dayYMD = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const isPast = dayYMD < todayYMD;
                      const isReserved = isDateReserved(dayYMD);
                      const isStart = dayYMD === rentalForm.startDate;
                      const isDue = dayYMD === rentalForm.dueDate;
                      const isInRange =
                        rentalForm.startDate &&
                        rentalForm.dueDate &&
                        dayYMD > rentalForm.startDate &&
                        dayYMD < rentalForm.dueDate;
                      const isToday = dayYMD === todayYMD;

                      const isDisabled = isPast || isReserved;

                      let bg = 'transparent';
                      let color = '#1e293b';
                      let fontWeight = 500;
                      let cursor = 'pointer';
                      let borderRadius = 6;
                      let border = '1px solid transparent';
                      let textDecoration = 'none';

                      if (isStart || isDue) {
                        bg = '#166534';
                        color = '#ffffff';
                        fontWeight = 700;
                        borderRadius = isStart && rentalForm.dueDate ? '6px 0 0 6px' : isDue && rentalForm.startDate ? '0 6px 6px 0' : 6;
                      } else if (isInRange) {
                        bg = '#dcfce7';
                        color = '#14532d';
                        fontWeight = 600;
                        borderRadius = 0;
                      } else if (isReserved) {
                        bg = '#f1f5f9';
                        color = '#94a3b8';
                        textDecoration = 'line-through';
                        cursor = 'not-allowed';
                        border = '1px dashed #cbd5e1';
                      } else if (isPast) {
                        color = '#cbd5e1';
                        cursor = 'not-allowed';
                      } else if (isToday) {
                        border = '1.5px solid #16a34a';
                        fontWeight = 700;
                      }

                      return (
                        <button
                          key={dayYMD}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleCalendarDateSelect(dayYMD)}
                          title={
                            isReserved
                              ? 'Reserved / Already booked'
                              : isPast
                              ? 'Past date'
                              : `Select ${dayYMD}`
                          }
                          style={{
                            height: 36,
                            width: '100%',
                            background: bg,
                            color,
                            fontWeight,
                            cursor,
                            border,
                            borderRadius,
                            textDecoration,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            transition: 'all 0.15s ease',
                            padding: 0,
                            position: 'relative',
                          }}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar Legend */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 16,
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: '1px solid #f1f5f9',
                      fontSize: 11,
                      color: '#64748b',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#166534', display: 'inline-block' }} />
                      <span>Selected</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, border: '1px solid #cbd5e1', background: '#ffffff', display: 'inline-block' }} />
                      <span>Available</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: '#f1f5f9',
                          border: '1px dashed #cbd5e1',
                          display: 'inline-block',
                          position: 'relative',
                        }}
                      >
                        <span style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: '#94a3b8' }} />
                      </span>
                      <span>Reserved</span>
                    </div>
                  </div>
                </div>

                {/* Price & Summary Breakdown when dates are chosen */}
                {rentalForm.startDate && rentalForm.dueDate && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '12px 14px',
                      marginBottom: 14,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="muted">Rental Duration:</span>
                      <span style={{ fontWeight: 600 }}>{rentalDays} {rentalDays === 1 ? 'day' : 'days'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="muted">Rent (₹{listing.rentalRate}/{listing.rentalPeriod}):</span>
                      <span style={{ fontWeight: 600 }}>₹{estimatedRent}</span>
                    </div>
                    {depositAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="muted">Security Deposit (Refundable):</span>
                        <span style={{ fontWeight: 600 }}>₹{depositAmount}</span>
                      </div>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderTop: '1px solid #cbd5e1',
                        paddingTop: 6,
                        marginTop: 6,
                        fontWeight: 700,
                        color: '#0f172a',
                      }}
                    >
                      <span>Estimated Total:</span>
                      <span style={{ color: '#166534', fontSize: 15 }}>₹{totalRentalAmount}</span>
                    </div>
                  </div>
                )}

                {/* Message to Owner */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#334155' }}>
                    Message to Owner (optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="E.g. I need this lab equipment for my lab test this Thursday..."
                    value={rentalForm.message}
                    onChange={(e) => setRentalForm((f) => ({ ...f, message: e.target.value }))}
                    style={{ width: '100%', resize: 'vertical', borderRadius: 8, border: '1px solid #cbd5e1', padding: '8px 10px', fontSize: 13 }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setShowRentModal(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      flex: 1.3,
                      background: '#166534',
                      opacity: !rentalForm.startDate || !rentalForm.dueDate ? 0.6 : 1,
                      cursor: !rentalForm.startDate || !rentalForm.dueDate ? 'not-allowed' : 'pointer',
                    }}
                    disabled={actionLoading || !rentalForm.startDate || !rentalForm.dueDate}
                  >
                    {actionLoading ? 'Submitting...' : 'Send Rental Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

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

      {/* ── Report Modal (US-14, FR-6.4) ────────────────────────────────────── */}
      {showReportModal && (
        <div style={backdropStyle} onClick={() => setShowReportModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, color: reportType === 'seller' ? '#92400e' : '#b91c1c' }}>
                <Flag size={20} />
                {reportType === 'seller' ? `Report Seller: ${sellerDisplayName}` : 'Report Item to Campus Moderation'}
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>
            <p className="muted" style={{ marginBottom: 16, fontSize: 13, lineHeight: 1.45 }}>
              {reportType === 'seller'
                ? 'Report this seller for misconduct, scam behaviour, or repeated policy violations. Admins will review all active listings by this seller.'
                : 'Report listings that violate university rules, contain misleading pricing, represent prohibited items, or are counterfeit.'}
            </p>
            <form onSubmit={handleReportListing}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#334155' }}>
                  Reason for Report
                </label>
                <select
                  className="input"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                >
                  <option value="Inappropriate Content">Inappropriate Content / Offensive Material</option>
                  <option value="Damaged / Counterfeit">Damaged / Counterfeit / Misrepresented Condition</option>
                  <option value="Prohibited Item">Prohibited Item on Campus</option>
                  <option value="Scam / Suspicious Behavior">Scam / Unrealistic Price / Suspicious Activity</option>
                  <option value="Other">Other Policy Violation</option>
                </select>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#334155' }}>
                  Details &amp; Evidence *
                </label>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Explain why this listing should be reviewed by administrators…"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowReportModal(false)}
                  disabled={submittingReport}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1.2, background: '#b91c1c' }}
                  disabled={submittingReport || !reportDetails.trim()}
                >
                  {submittingReport ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
