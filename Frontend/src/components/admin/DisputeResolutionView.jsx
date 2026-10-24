import React, { useState } from 'react';
import { Check, Scale } from 'lucide-react';
import AdminModal from './AdminModal';
import { formatDate, titleCase } from './adminUtils';

const priorityPill = (p) => (p === 'High' ? 'red' : p === 'Medium' ? 'yellow' : 'gray');
const statusPill = (s) => (s === 'resolved' ? 'green' : s === 'under_review' ? 'blue' : s === 'dismissed' ? 'gray' : 'yellow');
const shortId = (id = '') => String(id).slice(-6);

export default function DisputeResolutionView({ disputes = [], onResolve }) {
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

  const closeModal = () => { setSelectedDispute(null); setNotes(''); };

  const handleConfirmResolve = () => {
    onResolve(selectedDispute._id, resolutionStatus, actionTaken, notes);
    closeModal();
  };

  return (
    <div>
      <div className="adm-section-head">
        <h2>Dispute &amp; Incident Resolution Center</h2>
        <p>Investigate and resolve peer-to-peer transaction issues, rental overdue flags, and reports.</p>
      </div>

      <div className="adm-toolbar">
        <div className="adm-filters">
          <label className="adm-filter">
            Status
            <select className="adm-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </label>
          <label className="adm-filter">
            Priority
            <select className="adm-select" value={prioFilter} onChange={(e) => setPrioFilter(e.target.value)}>
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>
        </div>
      </div>

      <div className="adm-table-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Incident Details</th>
                <th>Reporter</th>
                <th>Reported Party</th>
                <th>Priority</th>
                <th>Status</th>
                <th className="right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="adm-empty">
                      <div className="adm-empty-icon"><Scale size={24} /></div>
                      <b>No disputes found</b>
                      <span>No active cases match the selected filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(d => (
                  <tr key={d._id}>
                    <td className="adm-mono" style={{ color: 'var(--text-muted)' }}>#{shortId(d._id)}</td>
                    <td>
                      <div className="adm-cell-title">{d.title}</div>
                      <div className="adm-cell-sub">{titleCase(d.disputeType)} • {formatDate(d.createdAt)}</div>
                    </td>
                    <td>{d.reporter?.profile?.name || d.reporter?.email || 'Reporter'}</td>
                    <td>{d.reportedUser?.profile?.name || d.reportedUser?.email || 'N/A'}</td>
                    <td><span className={`adm-pill ${priorityPill(d.priority)}`}>{d.priority}</span></td>
                    <td><span className={`adm-pill ${statusPill(d.status)}`}>{titleCase(d.status)}</span></td>
                    <td className="right">
                      <button type="button" className="adm-btn sm secondary" onClick={() => setSelectedDispute(d)}>
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDispute && (
        <AdminModal
          title={`Resolve Case #${shortId(selectedDispute._id)}`}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="adm-btn secondary" onClick={closeModal}>Cancel</button>
              <button type="button" className="adm-btn primary" onClick={handleConfirmResolve}>
                <Check size={15} /> Confirm Resolution
              </button>
            </>
          }
        >
          <div className="adm-panel">
            <div className="adm-cell-title" style={{ marginBottom: '0.3rem' }}>{selectedDispute.title}</div>
            <div style={{ lineHeight: 1.5 }}>{selectedDispute.description}</div>
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.6rem' }} className="adm-cell-sub">
              <span>Reporter: {selectedDispute.reporter?.profile?.name || 'Student'}</span>
              <span>Reported: {selectedDispute.reportedUser?.profile?.name || 'N/A'}</span>
            </div>
          </div>

          <div className="adm-field">
            <label className="adm-label" htmlFor="adm-res-status">Resolution status</label>
            <select id="adm-res-status" className="adm-select block" value={resolutionStatus} onChange={(e) => setResolutionStatus(e.target.value)}>
              <option value="resolved">Resolved (Case closed with outcome)</option>
              <option value="under_review">Under Review (Further investigation needed)</option>
              <option value="dismissed">Dismissed (Unfounded claim)</option>
            </select>
          </div>

          <div className="adm-field">
            <label className="adm-label" htmlFor="adm-res-action">Action to take</label>
            <select id="adm-res-action" className="adm-select block" value={actionTaken} onChange={(e) => setActionTaken(e.target.value)}>
              <option value="WarningIssued">Issue Warning to Reported User</option>
              <option value="UserSuspended">Suspend Reported Student Account</option>
              <option value="RefundAuthorized">Authorize Rental Deposit Refund</option>
              <option value="ListingRemoved">Remove Infringing Listing</option>
              <option value="NoAction">No Punitive Action Required</option>
            </select>
          </div>

          <div className="adm-field" style={{ marginBottom: 0 }}>
            <label className="adm-label" htmlFor="adm-res-notes">Admin mediation notes</label>
            <textarea
              id="adm-res-notes"
              className="adm-textarea"
              placeholder="Provide notes on the investigation and rationale for this resolution…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </AdminModal>
      )}
    </div>
  );
}
