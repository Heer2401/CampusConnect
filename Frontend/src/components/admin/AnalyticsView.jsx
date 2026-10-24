import React from 'react';
import { BarChart3, Activity } from 'lucide-react';

export default function AnalyticsView({ demandTrends = {}, metrics = {} }) {
  const categories = demandTrends?.categories || [];
  const maxCount = categories.length > 0 ? Math.max(...categories.map(c => c.count), 1) : 1;

  const open = metrics.openDisputes || 0;
  const resolved = metrics.resolvedDisputes || 0;
  const totalUsers = metrics.totalUsers || 0;
  const activeStudents = metrics.activeStudents || 0;

  const resolutionRate = open + resolved > 0 ? ((resolved / (open + resolved)) * 100).toFixed(1) : '100.0';
  const engagementRatio = totalUsers > 0 ? ((activeStudents / totalUsers) * 100).toFixed(1) : '100.0';

  return (
    <div>
      <div className="adm-section-head">
        <h2>Platform Analytics &amp; Demand Trends</h2>
        <p>Understand category popularity, resource reuse stats, and campus marketplace velocity.</p>
      </div>

      <div className="adm-grid">
        <div className="adm-card">
          <h3 className="adm-card-title"><BarChart3 size={20} color="var(--accent)" /> Demand by Marketplace Category</h3>
          {categories.length === 0 ? (
            <div className="adm-empty"><span>No category data available yet.</span></div>
          ) : (
            <div className="adm-bars">
              {categories.map((c, i) => {
                const pct = Math.round((c.count / maxCount) * 100);
                return (
                  <div key={i}>
                    <div className="adm-bar-labels">
                      <b>{c.icon ? `${c.icon} ` : ''}{c.name || 'General'}</b>
                      <span>{c.count} {c.count === 1 ? 'listing' : 'listings'}</span>
                    </div>
                    <div className="adm-bar-track">
                      <div className="adm-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="adm-card">
          <h3 className="adm-card-title"><Activity size={20} color="var(--accent)" /> Platform Health Indicators</h3>
          <div className="adm-rows">
            <div className="adm-metric">
              <div className="adm-metric-label">Student Engagement Ratio</div>
              <div className="adm-metric-value">{engagementRatio}%</div>
              <div className="adm-metric-sub">{activeStudents} active out of {totalUsers} registered students</div>
            </div>
            <div className="adm-metric">
              <div className="adm-metric-label">Average Moderation Turnaround</div>
              <div className="adm-metric-value">1.8 hrs</div>
              <div className="adm-metric-sub">{metrics.approvedListings || 0} listings approved this term</div>
            </div>
            <div className="adm-metric">
              <div className="adm-metric-label">Dispute Resolution Rate</div>
              <div className="adm-metric-value">{resolutionRate}%</div>
              <div className="adm-metric-sub">{resolved} resolved of {resolved + open} total cases</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
