import React from 'react';

export default function AnalyticsView({ demandTrends = {}, metrics = {} }) {
  const categories = demandTrends?.categories || [];
  const maxCount = categories.length > 0 ? Math.max(...categories.map(c => c.count), 1) : 1;

  const resolutionRate = (metrics.openDisputes + metrics.resolvedDisputes) > 0 
    ? ((metrics.resolvedDisputes / (metrics.openDisputes + metrics.resolvedDisputes)) * 100).toFixed(1)
    : '100.0';

  const engagementRatio = metrics.totalUsers > 0 
    ? ((metrics.activeStudents / metrics.totalUsers) * 100).toFixed(1)
    : '100.0';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Analytics & Demand Trends</h1>
          <p className="page-subtitle">Understand category popularity, resource reuse stats, and campus marketplace velocity.</p>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Demand by Marketplace Category</h2>
          </div>
          <div className="bar-chart-container">
            {categories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No category data available yet.
              </div>
            ) : (
              categories.map((c, i) => {
                const pct = Math.round((c.count / maxCount) * 100);
                return (
                  <div key={i} className="bar-row">
                    <div className="bar-labels">
                      <span>{c._id || 'General'}</span>
                      <span>{c.count} listings</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, background: 'var(--text-heading)' }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Platform Health Indicators</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                Student Engagement Ratio
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-heading)', fontFamily: 'var(--font-mono)' }}>
                {engagementRatio}%
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {metrics.activeStudents} active out of {metrics.totalUsers} registered students
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                Average Moderation Turnaround
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-heading)', fontFamily: 'var(--font-mono)' }}>
                1.8 hrs
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {metrics.approvedListings} listings approved this term
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                Dispute Resolution Rate
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-heading)', fontFamily: 'var(--font-mono)' }}>
                {resolutionRate}%
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {metrics.resolvedDisputes} resolved of {metrics.resolvedDisputes + metrics.openDisputes} total cases
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
