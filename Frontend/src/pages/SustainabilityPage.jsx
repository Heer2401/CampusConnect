import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, IndianRupee, Repeat, Sparkles, Award, Trees, Bell, ArrowRight } from 'lucide-react';

export default function SustainabilityPage() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSustainability = async () => {
      try {
        const res = await fetch('/api/sustainability/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Error fetching sustainability stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSustainability();
  }, [token]);

  const moneySaved = stats?.moneySaved || 0;
  const itemsReused = stats?.itemsReused || 0;
  const co2SavedKg = stats?.co2ImpactKg || stats?.co2SavedKg || 0;
  const transactions = stats?.transactions || 0;

  // Calculators for environmental equivalents
  const treesEquivalent = (co2SavedKg / 20).toFixed(1);

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto' }}>
      {/* Hero Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #064E3B 0%, #0A2540 100%)',
          color: 'white',
          border: 'none',
          padding: '2.5rem',
          marginBottom: '2rem',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '650px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(32, 201, 151, 0.2)',
              color: 'var(--accent)',
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '1rem',
            }}
          >
            <Leaf size={14} /> GREEN CAMPUS INITIATIVE
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.2 }}>
            Your Personal Sustainability Impact (FR-1.8)
          </h1>
          <p style={{ color: '#D1FAE5', marginTop: '0.5rem', fontSize: '0.95rem' }}>
            By exchanging, renting, and giving away pre-owned essentials instead of buying new,
            you help make our university campus greener and more affordable.
          </p>
        </div>
      </div>

      {/* Primary Impact Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon green">
            <IndianRupee size={28} />
          </div>
          <div>
            <div className="stat-value">₹{moneySaved.toLocaleString()}</div>
            <div className="stat-label">Total Student Money Saved</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <Repeat size={28} />
          </div>
          <div>
            <div className="stat-value">{itemsReused}</div>
            <div className="stat-label">Items Reused On Campus</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <Leaf size={28} />
          </div>
          <div>
            <div className="stat-value">{co2SavedKg.toFixed(1)} kg</div>
            <div className="stat-label">CO₂ Emissions Avoided</div>
          </div>
        </div>
      </div>

      {/* Environmental Insights & Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
            <Trees size={20} color="var(--accent)" />
            Campus Ecological Equivalency
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Trees Absorbing CO₂</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>≈ {treesEquivalent} trees / year</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Completed Exchanges</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{transactions} transactions</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
            <Award size={20} color="#F59E0B" />
            Eco-Contributor Badge
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
            Every completed textbook handoff or calculator rental counts toward your certified Campus Sustainability Score.
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: '#FEF3C7', color: '#B45309', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.8rem' }}>
              LEVEL 1: CAMPUS REUSER
            </span>
          </div>
        </div>
      </div>

      {/* Semester-End Reminder Card (FR-1.8) */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
          border: '1.5px solid #BFDBFE',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            background: '#2563EB',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Bell size={24} />
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E3A8A' }}>
            Semester-End Listing Reminder (FR-1.8)
          </h3>
          <p style={{ color: '#3B82F6', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Finishing Semester 3 exams? Don't leave your textbooks, lab kits, or drafting boards in your hostel room.
            List them on CampusConnect so junior students can reuse them next semester!
          </p>
        </div>
      </div>
    </div>
  );
}
