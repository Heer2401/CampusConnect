import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Star, ShieldCheck, BookOpen, Clock, Phone, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.profile?.name || '');
  const [program, setProgram] = useState(user?.profile?.program || '');
  const [year, setYear] = useState(user?.profile?.year || '');
  const [contactPreferences, setContactPreferences] = useState(user?.profile?.contactPreferences || '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      await updateProfile({ name, program, year, contactPreferences });
      setFeedback({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const rating = user?.reputation?.rating || 0;
  const reviewsCount = user?.reputation?.reviewsCount || 0;

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      {/* Profile Header Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0A2540 0%, #163B5F 100%)',
          color: 'white',
          border: 'none',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent) 0%, #0ea5e9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 700,
              color: 'white',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            }}
          >
            {user?.profile?.name ? user.profile.name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                {user?.profile?.name || 'Campus Student'}
              </h1>
              <span className="role-pill">{user?.role || 'Student'}</span>
              <span
                style={{
                  background: 'rgba(32, 201, 151, 0.15)',
                  color: 'var(--accent)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <ShieldCheck size={14} /> Verified Student
              </span>
            </div>

            <p style={{ color: '#94A3B8', fontSize: '0.925rem', marginTop: '0.35rem' }}>
              {user?.email}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Star size={16} fill="#F59E0B" color="#F59E0B" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {rating.toFixed(1)}
                </span>
                <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
                  ({reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>

              {user?.profile?.program && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#CBD5E1', fontSize: '0.85rem' }}>
                  <BookOpen size={15} />
                  <span>{user.profile.program}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <User size={20} color="var(--primary)" />
              Academic Profile & Settings (FR-1.4)
            </h2>
            <p className="card-description">
              Manage your academic credentials and how counterparties contact you on campus
            </p>
          </div>
        </div>

        {feedback && (
          <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
            {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dhrumil Doshi"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Program / Branch</label>
              <input
                type="text"
                className="form-input"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                placeholder="e.g. M.Sc. (Information Technology)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Semester / Year</label>
              <input
                type="text"
                className="form-input"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. Semester 3"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contact / Handover Preferences</label>
            <input
              type="text"
              className="form-input"
              value={contactPreferences}
              onChange={(e) => setContactPreferences(e.target.value)}
              placeholder="e.g. Campus Library, IT Dept Foyer, or WhatsApp: +91 98765 43210"
            />
            <div className="form-helper">
              Shared with verified students when coordinating item exchange or rental handover.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving Changes...' : 'Save Profile Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
