import React, { useState } from 'react';
import { IconX, IconScale, IconCheck } from '../common/Icons';

export default function DisputeResolutionView({ disputes = [], onResolve, loading, onRefresh }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [prioFilter, setPrioFilter] = useState('all');
  const [selectedDispute, setSelectedDispute] = useState(null);

  const [resolutionStatus, setResolutionStatus] = useState('resolved');
  const [actionTaken, setActionTaken] = useState('WarningIssued');
  const [notes, setNotes] = useState('');

  const filtered = disputes.filter(d => {
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchPrio = prioFilter === 'all' || d.priority === prioFilter;
    return matchStatus && matchPrio;
  });

  const handleConfirmResolve = () => {
    onResolve(selectedDispute._id, resolutionStatus, actionTaken, notes);
    setSelectedDispute(null);
    setNotes('');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dispute & Incident Resolution Center</h1>
          <p className="page-subtitle">Investigate and resolve peer-to-peer transaction issues, rental overdue flags, and reports.</p>
        </div>
      </div>

      <div className="controls-bar">
        <div className="filter-group">
          <label className="stat-label">Status:</label>
          <select 
            className="custom-select" 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <label className="stat-label" style={{ marginLeft: '0.5rem' }}>Priority:</label>
          <select 
            className="custom-select" 
            value={prioFilter}
            onChange={(e) => setPrioFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Incident Details</th>
              <th>Reporter</th>
              <th>Reported Party</th>
              <th>Priority</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ color: 'var(--text-heading)', fontWeight: 500, marginBottom: '0.25rem' }}>No disputes found</div>
                  <div style={{ fontSize: '0.75rem' }}>No active cases match the selected filter.</div>
                </td>
              </tr>
            ) : (
              filtered.map(d => (
                <tr key={d._id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {d._id.slice(-6)}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-heading)' }}>{d.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {d.disputeType} • {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td><div style={{ color: 'var(--text-heading)' }}>{d.reporter?.profile?.name || d.reporter?.email || 'Reporter'}</div></td>
                  <td><div style={{ color: 'var(--text-heading)' }}>{d.reportedUser?.profile?.name || d.reportedUser?.email || 'N/A'}</div></td>
                  <td>
                    <span className={`pill ${d.priority === 'High' ? 'pill-danger' : d.priority === 'Medium' ? 'pill-warning' : 'pill-secondary'}`}>
                      {d.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${d.status === 'resolved' ? 'pill-success' : d.status === 'under_review' ? 'pill-primary' : 'pill-warning'}`}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => setSelectedDispute(d)}>
                      <span>Resolve</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedDispute && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Resolve Case #{selectedDispute._id.slice(-6)}</h2>
              <button className="modal-close" onClick={() => setSelectedDispute(null)}><IconX size={15} /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.825rem' }}>
                <div style={{ fontWeight: 500, color: 'var(--text-heading)', marginBottom: '0.35rem' }}>{selectedDispute.title}</div>
                <div style={{ color: 'var(--text-body)', lineHeight: '1.5' }}>{selectedDispute.description}</div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Reporter: {selectedDispute.reporter?.profile?.name || 'Student'}</span>
                  <span>Reported: {selectedDispute.reportedUser?.profile?.name || 'N/A'}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Resolution Status</label>
                <select 
                  className="custom-select"
                  style={{ width: '100%' }}
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value)}
                >
                  <option value="resolved">Resolved (Case closed with outcome)</option>
                  <option value="under_review">Under Review (Further investigation needed)</option>
                  <option value="dismissed">Dismissed (Unfounded claim)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Action to Take</label>
                <select 
                  className="custom-select"
                  style={{ width: '100%' }}
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                >
                  <option value="WarningIssued">Issue Warning to Reported User</option>
                  <option value="UserSuspended">Suspend Reported Student Account</option>
                  <option value="RefundAuthorized">Authorize Rental Deposit Refund</option>
                  <option value="ListingRemoved">Remove Infringing Listing</option>
                  <option value="NoAction">No Punitive Action Required</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Admin Mediation Notes</label>
                <textarea 
                  className="form-textarea"
                  placeholder="Provide notes on the investigation and rationale for this resolution..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedDispute(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirmResolve}>
                <IconCheck size={13} />
                <span>Confirm Resolution</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
