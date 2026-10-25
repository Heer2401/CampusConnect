import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Tag,
  ArrowLeftRight,
  Package,
  Heart,
  CheckCircle2,
  Plus,
  Star,
} from 'lucide-react';
import { getMyTransactions } from '../features/rental/api/rentalApi';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.profile?.name || 'Dev Barot');
  const [program, setProgram] = useState(user?.profile?.program || 'MSc IT');
  const [year, setYear] = useState(user?.profile?.year || 'Sem 3');
  const [contactPreferences, setContactPreferences] = useState(
    user?.profile?.contactPreferences || ''
  );

  // Meetup spots management
  const [availableSpots, setAvailableSpots] = useState([
    'Library',
    'IT dept foyer',
    'Canteen',
    'Hostel gate',
  ]);
  const [selectedSpots, setSelectedSpots] = useState(['Library']);
  const [isAddingSpot, setIsAddingSpot] = useState(false);
  const [newSpotInput, setNewSpotInput] = useState('');
  const [shareWhatsApp, setShareWhatsApp] = useState(false);

  const [txCount, setTxCount] = useState(4);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Sync initial state when user loads
  useEffect(() => {
    if (user?.profile) {
      if (user.profile.name) setName(user.profile.name);
      if (user.profile.program) setProgram(user.profile.program);
      if (user.profile.year) setYear(user.profile.year);
      if (user.profile.contactPreferences) {
        setContactPreferences(user.profile.contactPreferences);
      }
    }
  }, [user]);

  // Fetch real transaction count for navigation card
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await getMyTransactions();
        const list = res.data || res.transactions || (Array.isArray(res) ? res : []);
        if (list.length > 0) {
          setTxCount(list.length);
        }
      } catch (err) {
        // Fallback to default
      }
    };
    fetchCount();
  }, []);

  const toggleSpot = (spot) => {
    if (selectedSpots.includes(spot)) {
      setSelectedSpots(selectedSpots.filter((s) => s !== spot));
    } else {
      setSelectedSpots([...selectedSpots, spot]);
    }
  };

  const handleAddSpot = (e) => {
    e.preventDefault();
    const trimmed = newSpotInput.trim();
    if (trimmed && !availableSpots.includes(trimmed)) {
      setAvailableSpots([...availableSpots, trimmed]);
      setSelectedSpots([...selectedSpots, trimmed]);
      setNewSpotInput('');
      setIsAddingSpot(false);
    }
  };

  const handleDiscard = () => {
    setName(user?.profile?.name || 'Dev Barot');
    setProgram(user?.profile?.program || 'MSc IT');
    setYear(user?.profile?.year || 'Sem 3');
    setSelectedSpots(['Library']);
    setFeedback(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const compiledPreferences = `Spots: ${selectedSpots.join(', ')}; WhatsApp: ${
        shareWhatsApp ? 'Yes' : 'No'
      }${contactPreferences ? `; Note: ${contactPreferences}` : ''}`;

      await updateProfile({
        name,
        program,
        year,
        contactPreferences: compiledPreferences,
      });
      setFeedback({ type: 'success', text: 'Profile updated successfully' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  // Helper for initials
  const displayName = name || user?.profile?.name || user?.email?.split('@')[0] || 'Dev Barot';
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'DB';

  const reviewsCount = user?.reputation?.reviewsCount || 0;
  const rating = user?.reputation?.rating || 0;

  return (
    <div
      style={{
        maxWidth: '920px',
        margin: '0 auto',
        padding: '1.5rem 1rem 3rem',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1
          style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 4px 0',
          }}
        >
          Profile
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
          Your campus identity and handover preferences.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            background: feedback.type === 'success' ? '#ecfdf5' : '#fee2e2',
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ── Top Profile Card ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          marginBottom: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Large Initials Avatar */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#dbeafe',
            color: '#1d4ed8',
            fontSize: '1.25rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        {/* Identity Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              {displayName}
            </span>
            <span
              style={{
                background: '#eff6ff',
                color: '#2563eb',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              Student
            </span>
            <span
              style={{
                background: '#ecfdf5',
                color: '#059669',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 size={12} />
              <span>Verified student</span>
            </span>
          </div>

          <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '3px' }}>
            {user?.email || '2025120692@dau.ac.in'}
          </div>

          <div
            style={{
              fontSize: '0.775rem',
              color: '#94a3b8',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
            }}
          >
            <span>{program || 'MSc IT'}</span>
            <span>·</span>
            <span>{year || 'Sem 3'}</span>
            <span>·</span>
            <span>
              {reviewsCount > 0 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {rating.toFixed(1)} <Star size={12} fill="#f59e0b" color="#f59e0b" /> ({reviewsCount} reviews)
                </span>
              ) : (
                'No reviews yet'
              )}
            </span>
            <span>·</span>
            <span>Eco level 1</span>
          </div>
        </div>
      </div>

      {/* ── 4 Quick Navigation Cards Row ─────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}
      >
        {/* Card 1: My listings */}
        <div
          onClick={() => navigate('/my-listings')}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#10b981')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <Tag size={16} color="#64748b" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
            My listings
          </span>
        </div>

        {/* Card 2: Transactions */}
        <div
          onClick={() => navigate('/transactions')}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#10b981')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ArrowLeftRight size={16} color="#64748b" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
              Transactions
            </span>
          </div>
          <span
            style={{
              background: '#f1f5f9',
              color: '#334155',
              padding: '1px 6px',
              borderRadius: '999px',
              fontSize: '0.725rem',
              fontWeight: 700,
            }}
          >
            {txCount}
          </span>
        </div>

        {/* Card 3: Rentals */}
        <div
          onClick={() => navigate('/rentals')}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#10b981')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <Package size={16} color="#64748b" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
            Rentals
          </span>
        </div>

        {/* Card 4: Wishlist */}
        <div
          onClick={() => navigate('/wishlist')}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#10b981')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <Heart size={16} color="#64748b" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
            Wishlist
          </span>
        </div>
      </div>

      {/* ── Main Details & Preferences Form Card ─────────────────────────────── */}
      <form
        onSubmit={handleUpdate}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Section 1: Academic details */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h2
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 1rem 0',
            }}
          >
            Academic details
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                Program
              </label>
              <input
                type="text"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ width: '50%', paddingRight: '0.5rem', boxSizing: 'border-box' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '6px',
              }}
            >
              Semester
            </label>
            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '0.875rem',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Section 2: Handover preferences */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 4px 0',
            }}
          >
            Handover preferences
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem 0' }}>
            Meetup spots you are happy to use. Shown to students you trade with.
          </p>

          {/* Spots Pill Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {availableSpots.map((spot) => {
              const isSelected = selectedSpots.includes(spot);
              return (
                <button
                  key={spot}
                  type="button"
                  onClick={() => toggleSpot(spot)}
                  style={{
                    background: isSelected ? '#0f172a' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#334155',
                    border: isSelected ? '1px solid #0f172a' : '1px solid #cbd5e1',
                    borderRadius: '999px',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {spot}
                </button>
              );
            })}

            {isAddingSpot ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="text"
                  placeholder="New spot name"
                  value={newSpotInput}
                  onChange={(e) => setNewSpotInput(e.target.value)}
                  autoFocus
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid #10b981',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddSpot}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingSpot(false)}
                  style={{
                    background: 'transparent',
                    color: '#64748b',
                    border: 'none',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingSpot(true)}
                style={{
                  background: '#ffffff',
                  color: '#64748b',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '999px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Plus size={13} />
                <span>Add spot</span>
              </button>
            )}
          </div>

          {/* WhatsApp Number Toggle Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.5rem',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: '#334155' }}>
              Share my WhatsApp number with students in an active deal
            </span>

            {/* Custom Toggle Switch */}
            <label
              style={{
                position: 'relative',
                display: 'inline-block',
                width: '40px',
                height: '22px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={shareWhatsApp}
                onChange={(e) => setShareWhatsApp(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: shareWhatsApp ? '#10b981' : '#cbd5e1',
                  borderRadius: '22px',
                  transition: '0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    content: '""',
                    height: '16px',
                    width: '16px',
                    left: shareWhatsApp ? '20px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </span>
            </label>
          </div>
        </div>

        {/* ── Action Buttons ─────────────────────────────────────────────────── */}
        <div
          style={{
            borderTop: '1px solid #f1f5f9',
            paddingTop: '1rem',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={handleDiscard}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            Discard
          </button>

          <button
            type="submit"
            disabled={saving}
            style={{
              background: '#10b981',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#ffffff',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
