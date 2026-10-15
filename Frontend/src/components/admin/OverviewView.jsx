import React from 'react';
import { 
  IconClock, 
  IconUsers, 
  IconPackage, 
  IconAlertCircle, 
  IconCheckCircle, 
  IconSlash, 
  IconShield, 
  IconScale, 
  IconArrowRight 
} from '../common/Icons';

export default function OverviewView({ metrics = {}, demandTrends = {}, onNavigate, onRefresh, loading }) {
  const weeklyVolume = demandTrends?.weeklyVolume || [];
  const maxVol = weeklyVolume.length > 0 ? Math.max(...weeklyVolume.map(w => w.count), 1) : 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Operations Overview</h1>
          <p className="page-subtitle">Real-time status of university marketplace activity, pending moderation, and member trust.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Pending Moderation</span>
            <span className="stat-icon-wrapper"><IconClock size={15} /></span>
          </div>
          <div className="stat-number">{metrics.pendingApprovals || 0}</div>
          <div className="stat-subtext">Listings awaiting approval</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Active Students</span>
            <span className="stat-icon-wrapper"><IconUsers size={15} /></span>
          </div>
          <div className="stat-number">{(metrics.activeStudents || 0).toLocaleString()}</div>
          <div className="stat-subtext">Verified university members</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Active Listings</span>
            <span className="stat-icon-wrapper"><IconPackage size={15} /></span>
          </div>
          <div className="stat-number">{(metrics.totalListings || 0).toLocaleString()}</div>
          <div className="stat-subtext">Total marketplace items</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Open Disputes</span>
            <span className="stat-icon-wrapper"><IconAlertCircle size={15} /></span>
          </div>
          <div className="stat-number">{metrics.openDisputes || 0}</div>
          <div className="stat-subtext">Cases under review</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Resolved Disputes</span>
            <span className="stat-icon-wrapper"><IconCheckCircle size={15} /></span>
          </div>
          <div className="stat-number">{metrics.resolvedDisputes || 0}</div>
          <div className="stat-subtext">Mediation concluded</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Suspended Accounts</span>
            <span className="stat-icon-wrapper"><IconSlash size={15} /></span>
          </div>
          <div className="stat-number">{metrics.suspendedUsers || 0}</div>
          <div className="stat-subtext">Trust & Safety actions taken</div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Marketplace Listing Volume (Last 4 Sprints)</h2>
          </div>
          <div className="weekly-bars-container">
            {weeklyVolume.map((w, idx) => {
              const heightPct = Math.round((w.count / maxVol) * 80) + 20;
              return (
                <div key={idx} className="volume-column">
                  <span className="volume-value">{w.count}</span>
                  <div className="volume-bar" style={{ height: `${heightPct}%` }}></div>
                  <span className="volume-week">{w.week}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Trust & Safety Status</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-body)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)' }}>
                <IconShield size={14} />
                <span>Automated Duplicate / OCR Checks</span>
              </span>
              <span className="pill pill-success">Active</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)' }}>
                <IconClock size={14} />
                <span>Average Moderation Response</span>
              </span>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>1.8 hrs</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)' }}>
                <IconShield size={14} />
                <span>University Domain Policy</span>
              </span>
              <span style={{ fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>*.edu</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)' }}>
                <IconScale size={14} />
                <span>Dispute Resolution Rate</span>
              </span>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                {metrics.openDisputes + metrics.resolvedDisputes > 0 
                  ? `${Math.round((metrics.resolvedDisputes / (metrics.openDisputes + metrics.resolvedDisputes)) * 100)}%` 
                  : '100%'}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => onNavigate('listings')}>
              <span>Review Pending Queue</span>
              <IconArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
