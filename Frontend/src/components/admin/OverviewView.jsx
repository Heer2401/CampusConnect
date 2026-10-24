import React from 'react';
import {
  Clock, Users, Package, AlertCircle, CheckCircle2, Ban,
  ShieldCheck, Scale, ArrowRight, BarChart3,
} from 'lucide-react';

const STATS = (m) => [
  { label: 'Pending Moderation',  value: m.pendingApprovals || 0,                    sub: 'Listings awaiting approval',     icon: Clock,        tone: 'amber' },
  { label: 'Active Students',     value: (m.activeStudents || 0).toLocaleString(),   sub: 'Verified university members',    icon: Users,        tone: 'blue' },
  { label: 'Active Listings',     value: (m.totalListings || 0).toLocaleString(),    sub: 'Total marketplace items',        icon: Package,      tone: 'green' },
  { label: 'Open Disputes',       value: m.openDisputes || 0,                        sub: 'Cases under review',             icon: AlertCircle,  tone: 'red' },
  { label: 'Resolved Disputes',   value: m.resolvedDisputes || 0,                    sub: 'Mediation concluded',            icon: CheckCircle2, tone: 'purple' },
  { label: 'Suspended Accounts',  value: m.suspendedUsers || 0,                      sub: 'Trust & Safety actions taken',   icon: Ban,          tone: 'slate' },
];

export default function OverviewView({ metrics = {}, demandTrends = {}, onNavigate }) {
  const weeklyVolume = demandTrends?.weeklyVolume || [];
  const maxVol = weeklyVolume.length > 0 ? Math.max(...weeklyVolume.map(w => w.count), 1) : 1;

  const open = metrics.openDisputes || 0;
  const resolved = metrics.resolvedDisputes || 0;
  const resolutionRate = open + resolved > 0 ? `${Math.round((resolved / (open + resolved)) * 100)}%` : '100%';

  return (
    <div>
      <div className="adm-section-head">
        <h2>Platform Operations Overview</h2>
        <p>Real-time status of university marketplace activity, pending moderation, and member trust.</p>
      </div>

      <div className="adm-stat-grid">
        {STATS(metrics).map(({ label, value, sub, icon: Icon, tone }) => (
          <div className="adm-stat" key={label}>
            <div className={`adm-stat-icon ${tone}`}><Icon size={26} /></div>
            <div>
              <div className="adm-stat-value">{value}</div>
              <div className="adm-stat-label">{label}</div>
              <div className="adm-stat-sub">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="adm-grid">
        <div className="adm-card">
          <h3 className="adm-card-title"><BarChart3 size={20} color="var(--accent)" /> Marketplace Listing Volume (Last 4 Sprints)</h3>
          {weeklyVolume.length === 0 ? (
            <div className="adm-empty"><span>No volume data available yet.</span></div>
          ) : (
            <div className="adm-volume">
              {weeklyVolume.map((w, idx) => {
                const heightPct = Math.round((w.count / maxVol) * 80) + 20;
                return (
                  <div key={idx} className="adm-volume-col">
                    <span className="adm-volume-val">{w.count}</span>
                    <div className="adm-volume-bar" style={{ height: `${heightPct * 0.75}%` }} />
                    <span className="adm-volume-week">{w.week}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="adm-card">
          <h3 className="adm-card-title"><ShieldCheck size={20} color="var(--accent)" /> Trust &amp; Safety Status</h3>
          <div className="adm-rows">
            <div className="adm-row">
              <span className="adm-row-label"><ShieldCheck size={16} /> Duplicate / OCR checks</span>
              <span className="adm-pill green">Active</span>
            </div>
            <div className="adm-row">
              <span className="adm-row-label"><Clock size={16} /> Moderation queue load</span>
              <span className="adm-row-value">{metrics.pendingApprovals || 0} items</span>
            </div>
            <div className="adm-row">
              <span className="adm-row-label"><ShieldCheck size={16} /> University domain policy</span>
              <span className="adm-row-value">*.edu</span>
            </div>
            <div className="adm-row">
              <span className="adm-row-label"><Scale size={16} /> Dispute resolution rate</span>
              <span className="adm-row-value good">{resolutionRate}</span>
            </div>
          </div>

          <button type="button" className="adm-btn primary block" style={{ marginTop: '1.25rem' }} onClick={() => onNavigate('listings')}>
            Review pending queue <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
