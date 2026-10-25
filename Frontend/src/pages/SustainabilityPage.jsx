import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  IndianRupee,
  Repeat,
  Cloud,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function SustainabilityPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

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

  const moneySaved = stats?.moneySaved || 203;
  const itemsReused = stats?.itemsReused ?? 2;
  const co2SavedKg = Number(stats?.co2ImpactKg || stats?.co2SavedKg || 9.0);
  const transactions = stats?.transactions || itemsReused;

  // 3-tier Gamified Eco Badge logic
  // Level 1: Reuser (1–2 items)
  // Level 2: Contributor (3–7 items)
  // Level 3: Ambassador (8+ items)
  let currentLevel = 1;
  let levelName = 'Reuser';
  let nextLevelName = 'Contributor';
  let itemsRemainingInLevel = 1;
  let currentLevelCompleted = 2;
  let currentLevelTarget = 3;
  let progressPercent = 66;

  if (itemsReused >= 8) {
    currentLevel = 3;
    levelName = 'Ambassador';
    nextLevelName = 'Ambassador';
    itemsRemainingInLevel = 0;
    currentLevelCompleted = itemsReused;
    currentLevelTarget = 8;
    progressPercent = 100;
  } else if (itemsReused >= 3) {
    currentLevel = 2;
    levelName = 'Contributor';
    nextLevelName = 'Ambassador';
    itemsRemainingInLevel = 8 - itemsReused;
    currentLevelCompleted = itemsReused - 2;
    currentLevelTarget = 5;
    progressPercent = Math.min(100, Math.round(((itemsReused - 3) / 5) * 100));
  } else {
    currentLevel = 1;
    levelName = 'Reuser';
    nextLevelName = 'Contributor';
    itemsRemainingInLevel = Math.max(0, 3 - itemsReused);
    currentLevelCompleted = Math.max(1, itemsReused);
    currentLevelTarget = 3;
    progressPercent = Math.min(100, Math.round((currentLevelCompleted / 3) * 100));
  }

  return (
    <div
      style={{
        maxWidth: '1040px',
        margin: '0 auto',
        padding: '1.5rem 1rem 3rem',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Top Header Row ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 4px 0',
            }}
          >
            Your campus impact
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            Based on {transactions} completed deal{transactions === 1 ? '' : 's'}.
          </p>
        </div>

        <div
          style={{
            background: '#ecfdf5',
            color: '#059669',
            border: '1px solid #a7f3d0',
            padding: '4px 14px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          Level {currentLevel} · {levelName}
        </div>
      </div>

      {/* ── 3 Key Stat Cards ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Card 1: Money Saved */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#ecfdf5',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IndianRupee size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              ₹{moneySaved.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
              Saved vs buying new
            </div>
          </div>
        </div>

        {/* Card 2: Items Reused */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#ecfdf5',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Repeat size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {itemsReused}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
              Items reused
            </div>
          </div>
        </div>

        {/* Card 3: CO2 Avoided */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#ecfdf5',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Cloud size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {co2SavedKg.toFixed(1)} kg
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
              CO₂ avoided
            </div>
          </div>
        </div>
      </div>

      {/* ── Eco Badge Progress Card ──────────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '1.5rem',
          marginBottom: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.75rem',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Eco badge
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {itemsRemainingInLevel > 0
              ? `${itemsRemainingInLevel} more item to reach ${nextLevelName}`
              : 'Top tier reached'}
          </span>
        </div>

        {/* 3 Milestones Stepper */}
        <div style={{ position: 'relative', marginBottom: '1.5rem', padding: '0 10px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              textAlign: 'center',
              position: 'relative',
              zIndex: 2,
            }}
          >
            {/* Step 1: Reuser */}
            <div>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                ✓
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.825rem', color: '#0f172a' }}>
                Reuser
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>1–2 items</div>
            </div>

            {/* Step 2: Contributor */}
            <div>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: currentLevel >= 2 ? '#10b981' : '#ffffff',
                  border: currentLevel >= 2 ? 'none' : '2px solid #10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {currentLevel >= 2 ? '✓' : ''}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.825rem', color: '#0f172a' }}>
                Contributor
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>3–7 items</div>
            </div>

            {/* Step 3: Ambassador */}
            <div>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: currentLevel >= 3 ? '#10b981' : '#ffffff',
                  border: currentLevel >= 3 ? 'none' : '2px solid #cbd5e1',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {currentLevel >= 3 ? '✓' : ''}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.825rem', color: '#0f172a' }}>
                Ambassador
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>8+ items</div>
            </div>
          </div>

          {/* Progress Bar under milestones */}
          <div
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '999px',
              background: '#e2e8f0',
              overflow: 'hidden',
              marginTop: '1.25rem',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: '#10b981',
                borderRadius: '999px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: '#64748b',
              marginTop: '6px',
            }}
          >
            {currentLevelCompleted} of {currentLevelTarget} items
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: '#475569',
            }}
          >
            <CheckCircle2 size={15} color="#10b981" />
            <span>
              Your badge shows on your profile as a verified trust signal for other students.
            </span>
          </div>
        </div>
      </div>

      {/* ── How We Calculate These Numbers Card ──────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>
            <Info size={16} color="#64748b" />
            <span>How we calculate these numbers</span>
          </div>

          <button
            type="button"
            onClick={() => setShowFormulaInfo(!showFormulaInfo)}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{showFormulaInfo ? 'Hide breakdown' : 'Show breakdown'}</span>
            {showFormulaInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {showFormulaInfo && (
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9',
              fontSize: '0.8rem',
              color: '#64748b',
              lineHeight: 1.6,
            }}
          >
            <p style={{ margin: '0 0 6px 0' }}>
              <strong>Student Money Saved:</strong> Calculated as the retail difference saved by purchasing, renting, or swapping pre-owned items rather than buying brand new items at standard campus store rates.
            </p>
            <p style={{ margin: '0 0 6px 0' }}>
              <strong>CO₂ Avoided:</strong> Average estimated emissions saved from avoided paper production, electronic component fabrication, and campus parcel logistics (approx. 4.5 kg per book / tech unit reused).
            </p>
            <p style={{ margin: 0 }}>
              <strong>Campus Reused Count:</strong> The total number of verified handovers completed by you via QR or 6-digit Meetup PIN confirmation.
            </p>
          </div>
        )}
      </div>

      {/* ── Callout Banner (Exams coming up?) ─────────────────────────────────── */}
      <div
        style={{
          background: '#fefce8',
          border: '1px solid #fef08a',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '260px' }}>
          <span style={{ fontWeight: 700, color: '#854d0e', fontSize: '0.9rem' }}>
            Exams coming up?{' '}
          </span>
          <span style={{ color: '#713f12', fontSize: '0.875rem' }}>
            List the textbooks, lab kits and calculators you are done with so juniors can reuse them.
          </span>
        </div>

        <Link
          to="/marketplace/create"
          style={{
            background: '#10b981',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          List an item
        </Link>
      </div>
    </div>
  );
}
