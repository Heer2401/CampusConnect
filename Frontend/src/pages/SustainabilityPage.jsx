import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Leaf,
  IndianRupee,
  Repeat,
  Award,
  Bell,
  Info,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function SustainabilityPage() {
  const { token, user } = useAuth();
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

  const moneySaved = stats?.moneySaved || 0;
  const itemsReused = stats?.itemsReused || 0;
  const co2SavedKg = Number(stats?.co2ImpactKg || stats?.co2SavedKg || 0);
  const transactions = stats?.transactions || 0;

  // ── 3-Tier Gamified Eco Badge Calculation ──────────────────────────────────
  // Level 1: Campus Reuser (1–2 items completed, unlocks at 1, graduates at 3)
  // Level 2: Eco Contributor (3–7 items completed, unlocks at 3, graduates at 8)
  // Level 3: Green Campus Ambassador (8+ items completed, top tier)
  const totalItems = itemsReused;

  let currentLevel = 1;
  let levelTitle = 'LEVEL 1: CAMPUS REUSER';
  let levelTheme = { color: '#92400e', bg: '#fef3c7', border: '#fde68a' };

  let currentLevelCompleted = 0;
  let currentLevelTarget = 3;
  let itemsRemainingInLevel = 3;
  let currentLevelPercent = 0;
  let nextLevelName = 'Level 2: Eco Contributor';

  // Overall 3-tier roadmap percentage (0 to 8 items = 0% to 100%)
  const overallRoadmapPercent = Math.min(100, Math.round((totalItems / 8) * 100));

  if (totalItems >= 8) {
    currentLevel = 3;
    levelTitle = 'LEVEL 3: GREEN AMBASSADOR';
    levelTheme = { color: '#166534', bg: '#dcfce7', border: '#86efac' };
    currentLevelCompleted = totalItems;
    currentLevelTarget = 8;
    itemsRemainingInLevel = 0;
    currentLevelPercent = 100;
    nextLevelName = 'Top Tier Achieved 🏆';
  } else if (totalItems >= 3) {
    currentLevel = 2;
    levelTitle = 'LEVEL 2: ECO CONTRIBUTOR';
    levelTheme = { color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' };
    currentLevelCompleted = totalItems - 3;
    currentLevelTarget = 5; // 8 - 3 = 5 items in Level 2
    itemsRemainingInLevel = 8 - totalItems;
    currentLevelPercent = Math.min(100, Math.round((currentLevelCompleted / 5) * 100));
    nextLevelName = 'Level 3: Green Ambassador';
  } else {
    currentLevel = 1;
    levelTitle = 'LEVEL 1: CAMPUS REUSER';
    levelTheme = { color: '#92400e', bg: '#fef3c7', border: '#fde68a' };
    currentLevelCompleted = totalItems;
    currentLevelTarget = 3; // 3 items to finish Level 1
    itemsRemainingInLevel = 3 - totalItems;
    currentLevelPercent = Math.min(100, Math.round((totalItems / 3) * 100));
    nextLevelName = 'Level 2: Eco Contributor';
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #064E3B 0%, #0F2D3A 100%)',
          color: 'white',
          border: 'none',
          padding: '2.5rem 2.25rem',
          marginBottom: '2rem',
          borderRadius: '16px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(6, 78, 59, 0.2)',
        }}
      >
        <div style={{ maxWidth: '680px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(34, 197, 94, 0.22)',
              color: '#86efac',
              padding: '0.3rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              marginBottom: '1rem',
              border: '1px solid rgba(134, 239, 172, 0.3)',
            }}
          >
            <Leaf size={14} /> CAMPUS CIRCULAR ECONOMY
          </div>

          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.25, margin: '0 0 0.75rem 0' }}>
            Your Campus Sustainability Impact
          </h1>

          <p style={{ color: '#d1fae5', margin: 0, fontSize: '1rem', lineHeight: 1.6 }}>
            Every time you purchase a used textbook, rent lab equipment, or pass on study materials instead of buying new,
            you keep waste out of landfills and reduce student living costs on campus.
          </p>
        </div>
      </div>

      {/* ── Key Impact Metrics Grid ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Metric 1: Money Saved */}
        <div
          className="card"
          style={{
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '12px',
              background: '#dcfce7',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IndianRupee size={28} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              ₹{moneySaved.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginTop: '4px' }}>
              Student Money Saved
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
              vs. brand-new retail purchases
            </div>
          </div>
        </div>

        {/* Metric 2: Items Reused */}
        <div
          className="card"
          style={{
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '12px',
              background: '#dbeafe',
              color: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Repeat size={28} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {itemsReused}
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginTop: '4px' }}>
              Items Circulated on Campus
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
              kept out of dorm room waste
            </div>
          </div>
        </div>

        {/* Metric 3: CO2 Emissions Avoided */}
        <div
          className="card"
          style={{
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '12px',
              background: '#fef3c7',
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Leaf size={28} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {co2SavedKg.toFixed(1)} kg
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginTop: '4px' }}>
              CO₂ Emissions Avoided
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
              manufacturing & shipping offset
            </div>
          </div>
        </div>
      </div>

      {/* ── Horizontal Full-Width Campus Eco Badge with 2 Progress Bars ─────── */}
      <div
        className="card"
        style={{
          width: '100%',
          padding: '2rem',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          marginBottom: '2rem',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Top Header of Badge Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: levelTheme.bg,
                color: levelTheme.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Campus Eco Badge
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Every completed item handoff, rental return, or giveaway on campus advances your verified eco rating.
              </p>
            </div>
          </div>

          <div
            style={{
              background: levelTheme.bg,
              color: levelTheme.color,
              border: `1.5px solid ${levelTheme.border}`,
              padding: '0.4rem 1rem',
              borderRadius: '9999px',
              fontWeight: 800,
              fontSize: '0.825rem',
              letterSpacing: '0.4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={14} />
            {levelTitle}
          </div>
        </div>

        {/* ── 2 Progress Bars Grid ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Progress Bar 1: Overall 3-Level Roadmap */}
          <div
            style={{
              padding: '1.25rem',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.6rem' }}>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                  1. Overall Tier Roadmap (3 Levels)
                </span>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Progress across all campus eco ranks
                </p>
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#166534' }}>
                {overallRoadmapPercent}%
              </span>
            </div>

            {/* Overall Bar */}
            <div
              style={{
                width: '100%',
                height: '10px',
                borderRadius: '9999px',
                background: '#e2e8f0',
                overflow: 'hidden',
                margin: '0.85rem 0',
              }}
            >
              <div
                style={{
                  width: `${overallRoadmapPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #f59e0b 0%, #3b82f6 50%, #10b981 100%)',
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>

            {/* 3 Level Milestones Labels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', fontSize: '0.72rem', color: '#64748b' }}>
              <div style={{ fontWeight: currentLevel >= 1 ? 700 : 400, color: currentLevel >= 1 ? '#b45309' : '#94a3b8' }}>
                ● Lvl 1: Reuser (1–2)
              </div>
              <div style={{ textAlign: 'center', fontWeight: currentLevel >= 2 ? 700 : 400, color: currentLevel >= 2 ? '#1d4ed8' : '#94a3b8' }}>
                ● Lvl 2: Contributor (3–7)
              </div>
              <div style={{ textAlign: 'right', fontWeight: currentLevel >= 3 ? 700 : 400, color: currentLevel >= 3 ? '#166534' : '#94a3b8' }}>
                ● Lvl 3: Ambassador (8+)
              </div>
            </div>
          </div>

          {/* Progress Bar 2: Current Level Target (Items needed for this level) */}
          <div
            style={{
              padding: '1.25rem',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.6rem' }}>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                  2. Current Level Milestone ({currentLevel === 3 ? 'Max Level' : `Level ${currentLevel}`})
                </span>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Items needed to graduate to the next tier
                </p>
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: levelTheme.color }}>
                {currentLevel === 3
                  ? 'Completed'
                  : `${currentLevelCompleted} / ${currentLevelTarget} items`}
              </span>
            </div>

            {/* Current Level Bar */}
            <div
              style={{
                width: '100%',
                height: '10px',
                borderRadius: '9999px',
                background: '#e2e8f0',
                overflow: 'hidden',
                margin: '0.85rem 0',
              }}
            >
              <div
                style={{
                  width: `${currentLevelPercent}%`,
                  height: '100%',
                  background: currentLevel === 3 ? '#16a34a' : currentLevel === 2 ? '#2563eb' : '#f59e0b',
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>

            {/* Current Level Helper Note */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#475569', fontWeight: 600 }}>
                {currentLevel === 3
                  ? '🌟 Top tier unlocked! You are a campus sustainability leader.'
                  : `${itemsRemainingInLevel} more item${itemsRemainingInLevel === 1 ? '' : 's'} needed for ${nextLevelName}`}
              </span>
              <span style={{ color: levelTheme.color, fontWeight: 700 }}>
                {currentLevelPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Verification Note */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.825rem',
            color: '#475569',
          }}
        >
          <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
          <span>
            <b>Verified Academic Credential:</b> Your Eco Badge level is recognized on your student profile to indicate trusted campus standing.
          </span>
        </div>
      </div>

      {/* ── Transparent "How It's Calculated" Card ─────────────────────────── */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          borderRadius: '14px',
          marginBottom: '2rem',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
        }}
      >
        <div
          onClick={() => setShowFormulaInfo(!showFormulaInfo)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Info size={20} color="#2563eb" />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              How are these numbers calculated? (Transparent Methodology)
            </h4>
          </div>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {showFormulaInfo ? 'Hide details ▲' : 'View breakdown ▼'}
          </button>
        </div>

        {showFormulaInfo && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
              These metrics are computed dynamically from your real completed transactions on CampusConnect using verified product lifecycle data:
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
              }}
            >
              <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <b style={{ color: '#0f172a', fontSize: '0.85rem' }}>📚 Books & Study Material</b>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  <b>~2.5 kg CO₂</b> saved per reused textbook (prevents virgin paper milling, printing, and distribution).
                </p>
              </div>
              <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <b style={{ color: '#0f172a', fontSize: '0.85rem' }}>🔬 Lab Gear & Electronics</b>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  <b>~12.0 kg CO₂</b> avoided per device (offsets intensive semiconductor fabrication & rare metal mining).
                </p>
              </div>
              <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <b style={{ color: '#0f172a', fontSize: '0.85rem' }}>🛋️ Hostel & Room Essentials</b>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  <b>~5.5 kg CO₂</b> avoided per dorm furnishing (keeps useful items circulating between semesters).
                </p>
              </div>
              <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <b style={{ color: '#0f172a', fontSize: '0.85rem' }}>💰 Financial Savings (₹)</b>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Direct cash saved by paying used or rental rates vs. full original retail store prices.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Action Prompts: If 0 items vs Active user ───────────────────────── */}
      {itemsReused === 0 ? (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
            border: '1.5px solid #bbf7d0',
            padding: '1.75rem',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#166534' }}>
              Ready to create your first campus eco impact?
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569' }}>
              Rent equipment, request a textbook, or list an item you no longer need to see your stats grow!
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link
              to="/marketplace"
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.6rem 1rem' }}
            >
              Browse Marketplace
            </Link>
            <Link
              to="/marketplace/create"
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.6rem 1rem', background: '#166534' }}
            >
              + List an Item
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            border: '1.5px solid #bfdbfe',
            padding: '1.5rem',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: '#2563eb',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={22} />
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e3a8a' }}>
              Semester-End Sustainable Reuse Reminder
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#3b82f6' }}>
              Finishing semester exams? Don't leave your textbooks, lab kits, or calculators in your hostel room.
              List them on CampusConnect so incoming junior students can reuse them!
            </p>
          </div>
          <Link
            to="/marketplace/create"
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.55rem 1rem', whiteSpace: 'nowrap' }}
          >
            Share an Item →
          </Link>
        </div>
      )}
    </div>
  );
}
