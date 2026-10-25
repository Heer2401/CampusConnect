import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Tag,
  ArrowLeftRight,
  Package,
  Heart,
  CheckCircle2,
  Plus,
  X,
  Mail,
  GraduationCap,
  Calendar,
  Leaf,
  Edit3,
  User,
  BookOpen,
  MapPin,
  ShieldCheck,
  Save,
  ChevronDown,
} from 'lucide-react';
import { getMyTransactions } from '../features/rental/api/rentalApi';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const nameInputRef = useRef(null);

  const [name, setName] = useState(user?.profile?.name || 'Dev');
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

  const [txCount, setTxCount] = useState(3);
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

  const removeSpot = (e, spot) => {
    e.stopPropagation();
    setSelectedSpots(selectedSpots.filter((s) => s !== spot));
    setAvailableSpots(availableSpots.filter((s) => s !== spot));
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
    setName(user?.profile?.name || 'Dev');
    setProgram(user?.profile?.program || 'MSc IT');
    setYear(user?.profile?.year || 'Sem 3');
    setSelectedSpots(['Library']);
    setFeedback(null);
  };

  const handleFocusEdit = () => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const compiledPreferences = `Spots: ${selectedSpots.join(', ')}${
        contactPreferences ? `; Note: ${contactPreferences}` : ''
      }`;

      await updateProfile({
        name,
        program,
        year,
        contactPreferences: compiledPreferences,
      });
      setFeedback({ type: 'success', text: 'Profile updated successfully' });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  // Helper for initials
  const displayName = name || user?.profile?.name || user?.email?.split('@')[0] || 'Dev';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'D';
  const userEmail = user?.email || '2025120691@dau.ac.in';

  return (
    <div className="profile-page">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="profile-header-container">
        <div>
          <h1 className="profile-header-title">Profile</h1>
          <p className="profile-header-subtitle">
            Your campus identity and handover preferences.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            background: feedback.type === 'success' ? '#ecfdf5' : '#fee2e2',
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            padding: '10px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ── Top Profile Hero Card ────────────────────────────────────────────── */}
      <div className="profile-hero-card">
        <div className="profile-hero-left">
          {/* Avatar Circle */}
          <div className="profile-hero-avatar">{initial}</div>

          {/* Identity Details */}
          <div>
            <div className="profile-hero-name-row">
              <span className="profile-hero-name">{displayName}</span>
              <span className="profile-pill-role">Student</span>
              <span className="profile-pill-verified">
                <CheckCircle2 size={13} />
                <span>Verified student</span>
              </span>
            </div>

            <div className="profile-hero-meta-row">
              <span className="profile-meta-item">
                <Mail size={13} color="#64748b" />
                <span>{userEmail}</span>
              </span>
              <span className="profile-meta-dot">·</span>
              <span className="profile-meta-item">
                <GraduationCap size={13} color="#64748b" />
                <span>{program}</span>
              </span>
              <span className="profile-meta-dot">·</span>
              <span className="profile-meta-item">
                <Calendar size={13} color="#64748b" />
                <span>{year}</span>
              </span>
              <span className="profile-meta-dot">·</span>
              <span className="profile-meta-item" style={{ color: '#16a34a' }}>
                <Leaf size={13} color="#16a34a" />
                <span>Eco level 1</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Edit profile button */}
        <button
          type="button"
          onClick={handleFocusEdit}
          className="profile-edit-btn"
        >
          <Edit3 size={14} />
          <span>Edit profile</span>
        </button>
      </div>

      {/* ── 4 Quick Navigation Cards Row ─────────────────────────────────────── */}
      <div className="profile-nav-grid">
        {/* Card 1: My listings */}
        <Link to="/my-listings" className="profile-nav-card">
          <Tag size={16} color="#16a34a" />
          <span>My listings</span>
        </Link>

        {/* Card 2: Transactions */}
        <Link to="/transactions" className="profile-nav-card">
          <ArrowLeftRight size={16} color="#16a34a" />
          <span>Transactions</span>
          <span className="profile-tx-badge">{txCount}</span>
        </Link>

        {/* Card 3: Rentals */}
        <Link to="/rentals" className="profile-nav-card">
          <Package size={16} color="#16a34a" />
          <span>Rentals</span>
        </Link>

        {/* Card 4: Wishlist */}
        <Link to="/wishlist" className="profile-nav-card">
          <Heart size={16} color="#16a34a" />
          <span>Wishlist</span>
        </Link>
      </div>

      {/* ── Main Details & Preferences Form ──────────────────────────────────── */}
      <form onSubmit={handleUpdate}>
        {/* Section 1: Academic details */}
        <div className="profile-section-card">
          <div className="profile-section-header">
            <div className="profile-section-title-wrap">
              <div className="profile-icon-box profile-icon-blue">
                <GraduationCap size={20} />
              </div>
              <div>
                <h2 className="profile-section-title">Academic details</h2>
                <p className="profile-section-subtitle">
                  Keep your academic information up to date.
                </p>
              </div>
            </div>
          </div>

          <div className="profile-fields-row">
            {/* Full Name */}
            <div className="profile-field-group">
              <label className="profile-field-label">Full name</label>
              <div className="profile-input-container">
                <User size={16} color="#64748b" />
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="profile-input-field"
                  placeholder="Enter full name"
                  required
                />
              </div>
            </div>

            {/* Program */}
            <div className="profile-field-group">
              <label className="profile-field-label">Program</label>
              <div className="profile-input-container">
                <BookOpen size={16} color="#64748b" />
                <select
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  className="profile-select-field"
                >
                  <option value="MSc IT">MSc IT</option>
                  <option value="BTech CSE">BTech CSE</option>
                  <option value="BTech ICT">BTech ICT</option>
                  <option value="BTech MnC">BTech MnC</option>
                  <option value="MTech">MTech</option>
                  <option value="PhD">PhD</option>
                </select>
                <ChevronDown size={14} color="#64748b" style={{ pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Semester */}
            <div className="profile-field-group">
              <label className="profile-field-label">Semester</label>
              <div className="profile-input-container">
                <Calendar size={16} color="#64748b" />
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="profile-select-field"
                >
                  <option value="Sem 1">Sem 1</option>
                  <option value="Sem 2">Sem 2</option>
                  <option value="Sem 3">Sem 3</option>
                  <option value="Sem 4">Sem 4</option>
                  <option value="Sem 5">Sem 5</option>
                  <option value="Sem 6">Sem 6</option>
                  <option value="Sem 7">Sem 7</option>
                  <option value="Sem 8">Sem 8</option>
                </select>
                <ChevronDown size={14} color="#64748b" style={{ pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Handover preferences */}
        <div className="profile-section-card">
          <div className="profile-section-header">
            <div className="profile-section-title-wrap">
              <div className="profile-icon-box profile-icon-green">
                <MapPin size={20} />
              </div>
              <div>
                <h2 className="profile-section-title">Handover preferences</h2>
                <p className="profile-section-subtitle">
                  Meetup spots you are happy to use. Shown to students you trade with.
                </p>
              </div>
            </div>

            {/* Add Spot button */}
            {isAddingSpot ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Spot name"
                  value={newSpotInput}
                  onChange={(e) => setNewSpotInput(e.target.value)}
                  autoFocus
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #2563eb',
                    fontSize: '13px',
                    outline: 'none',
                    width: 140,
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddSpot}
                  className="profile-add-spot-btn"
                  style={{ background: '#2563eb', color: '#fff', border: 'none' }}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingSpot(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '12px',
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
                className="profile-add-spot-btn"
              >
                <Plus size={14} />
                <span>Add spot</span>
              </button>
            )}
          </div>

          {/* Spots Pills */}
          <div className="profile-spots-container">
            {availableSpots.map((spot) => {
              const isSelected = selectedSpots.includes(spot);
              return (
                <button
                  key={spot}
                  type="button"
                  onClick={() => toggleSpot(spot)}
                  className={`profile-spot-pill ${isSelected ? 'active' : 'inactive'}`}
                >
                  <span>{spot}</span>
                  <X
                    size={13}
                    onClick={(e) => removeSpot(e, spot)}
                    style={{ opacity: isSelected ? 0.8 : 0.4 }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Bottom Verification & Action Bar ──────────────────────────────── */}
        <div className="profile-bottom-bar">
          <div className="profile-verify-callout">
            <ShieldCheck size={20} color="#2563eb" style={{ flexShrink: 0 }} />
            <div>
              <div className="profile-verify-title">Verified student</div>
              <div className="profile-verify-sub">
                Your profile is verified using your campus email address. This helps build trust within the CampusConnect community.
              </div>
            </div>
          </div>

          <div className="profile-actions-group">
            <button
              type="button"
              onClick={handleDiscard}
              className="profile-discard-btn"
            >
              Discard
            </button>

            <button
              type="submit"
              disabled={saving}
              className="profile-save-btn"
            >
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save changes'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
