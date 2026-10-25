import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  IndianRupee,
  Repeat,
  Leaf,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  Recycle,
  GraduationCap,
  ArrowRight,
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

  const moneySaved = stats?.moneySaved ?? 200;
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
    <div className="sustainability-page">
      {/* ── Top Header Row ──────────────────────────────────────────────────── */}
      <div className="sustainability-header">
        <div>
          <h1 className="sustainability-title">Your campus impact</h1>
          <p className="sustainability-subtitle">
            Based on {transactions} completed deal{transactions === 1 ? '' : 's'}.
          </p>
        </div>

        <div className="sustainability-level-badge">
          <Leaf size={14} color="#15803d" />
          <span>
            Level {currentLevel} · {levelName}
          </span>
        </div>
      </div>

      {/* ── 3 Key Stat Cards ─────────────────────────────────────────────────── */}
      <div className="sustainability-metrics-grid">
        {/* Card 1: Money Saved */}
        <div className="sustainability-metric-card">
          <div className="sustainability-metric-icon-box sustainability-icon-green">
            <IndianRupee size={22} />
          </div>
          <div>
            <div className="sustainability-metric-val">
              ₹{moneySaved.toLocaleString('en-IN')}
            </div>
            <div className="sustainability-metric-lbl">Saved vs buying new</div>
          </div>
        </div>

        {/* Card 2: Items Reused */}
        <div className="sustainability-metric-card">
          <div className="sustainability-metric-icon-box sustainability-icon-blue">
            <Repeat size={22} />
          </div>
          <div>
            <div className="sustainability-metric-val">{itemsReused}</div>
            <div className="sustainability-metric-lbl">Items reused</div>
          </div>
        </div>

        {/* Card 3: CO2 Avoided */}
        <div className="sustainability-metric-card">
          <div className="sustainability-metric-icon-box sustainability-icon-green">
            <Leaf size={22} />
          </div>
          <div>
            <div className="sustainability-metric-val">{co2SavedKg.toFixed(1)} kg</div>
            <div className="sustainability-metric-lbl">CO₂ avoided</div>
          </div>
        </div>
      </div>

      {/* ── Eco Badge Progress Card ──────────────────────────────────────────── */}
      <div className="sustainability-badge-card">
        <div className="sustainability-badge-header">
          <div>
            <h2 className="sustainability-badge-title">Eco badge</h2>
            <p className="sustainability-badge-desc">
              Earn higher badges by helping more items find a new home.
            </p>
          </div>

          <span className="sustainability-badge-target">
            {itemsRemainingInLevel > 0
              ? `${itemsRemainingInLevel} more item to reach ${nextLevelName}`
              : 'Top tier reached'}
          </span>
        </div>

        {/* 3 Milestones Stepper */}
        <div className="sustainability-stepper">
          {/* Step 1: Reuser */}
          <div className="sustainability-step">
            <div className="sustainability-step-circle sustainability-step-completed">
              <Check size={14} strokeWidth={3} />
            </div>
            <div className="sustainability-step-name">Reuser</div>
            <div className="sustainability-step-range">1–2 items</div>
          </div>

          {/* Step 2: Contributor */}
          <div className="sustainability-step">
            <div
              className={`sustainability-step-circle ${
                currentLevel >= 2
                  ? 'sustainability-step-completed'
                  : currentLevel === 1
                  ? 'sustainability-step-active'
                  : 'sustainability-step-upcoming'
              }`}
            >
              {currentLevel >= 2 ? <Check size={14} strokeWidth={3} /> : null}
            </div>
            <div className="sustainability-step-name">Contributor</div>
            <div className="sustainability-step-range">3–7 items</div>
          </div>

          {/* Step 3: Ambassador */}
          <div className="sustainability-step">
            <div
              className={`sustainability-step-circle ${
                currentLevel >= 3
                  ? 'sustainability-step-completed'
                  : 'sustainability-step-upcoming'
              }`}
            >
              {currentLevel >= 3 ? <Check size={14} strokeWidth={3} /> : null}
            </div>
            <div className="sustainability-step-name">Ambassador</div>
            <div className="sustainability-step-range">8+ items</div>
          </div>
        </div>

        {/* Progress Bar under milestones */}
        <div className="sustainability-progress-track">
          <div
            className="sustainability-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="sustainability-progress-label">
          {currentLevelCompleted} of {currentLevelTarget} items
        </div>

        <div className="sustainability-trust-banner">
          <CheckCircle2 size={16} color="#10b981" />
          <span>
            Your badge shows on your profile as a verified trust signal for other students.
          </span>
        </div>
      </div>

      {/* ── How We Calculate These Numbers Card ──────────────────────────────── */}
      <div className="sustainability-calc-card">
        <div className="sustainability-calc-header">
          <div className="sustainability-calc-title">
            <Info size={18} color="#2563eb" />
            <span>How we calculate these numbers</span>
          </div>

          <button
            type="button"
            onClick={() => setShowFormulaInfo(!showFormulaInfo)}
            className="sustainability-calc-toggle"
          >
            <span>{showFormulaInfo ? 'Hide breakdown' : 'Show breakdown'}</span>
            {showFormulaInfo ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        {showFormulaInfo && (
          <div className="sustainability-calc-rows">
            {/* Row 1: Student Money Saved */}
            <div className="sustainability-calc-row">
              <div className="sustainability-calc-icon-box">
                <IndianRupee size={18} />
              </div>
              <div>
                <div className="sustainability-calc-row-title">Student Money Saved</div>
                <div className="sustainability-calc-row-desc">
                  Calculated as the retail difference saved by purchasing, renting, or swapping pre-owned items rather than buying brand new items at standard campus store rates.
                </div>
              </div>
            </div>

            {/* Row 2: CO2 Avoided */}
            <div className="sustainability-calc-row">
              <div className="sustainability-calc-icon-box">
                <Leaf size={18} />
              </div>
              <div>
                <div className="sustainability-calc-row-title">CO₂ Avoided</div>
                <div className="sustainability-calc-row-desc">
                  Average estimated emissions saved from avoided paper production, electronic component fabrication, and campus parcel logistics (approx. 4.5 kg per book / tech unit reused).
                </div>
              </div>
            </div>

            {/* Row 3: Campus Reused Count */}
            <div className="sustainability-calc-row">
              <div className="sustainability-calc-icon-box">
                <Recycle size={18} />
              </div>
              <div>
                <div className="sustainability-calc-row-title">Campus Reused Count</div>
                <div className="sustainability-calc-row-desc">
                  The total number of verified handovers completed by you via QR or 6-digit Meetup PIN confirmation.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Callout Banner (Exams coming up?) ─────────────────────────────────── */}
      <div className="sustainability-callout-card">
        <div className="sustainability-callout-left">
          <div className="sustainability-callout-icon-box">
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="sustainability-callout-title">Exams coming up?</div>
            <div className="sustainability-callout-desc">
              List the textbooks, lab kits and calculators you are done with so juniors can reuse them.
            </div>
          </div>
        </div>

        <Link to="/marketplace/create" className="sustainability-callout-btn">
          <span>List an item</span>
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
