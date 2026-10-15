import React, { useState } from 'react';
import { IconSearch, IconX, IconSlash, IconCheck } from '../common/Icons';

export default function UserManagementView({ users = [], onToggleStatus, loading, onRefresh }) {
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [suspendingUser, setSuspendingUser] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchSearch = !searchTerm || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.profile?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchRole && matchStatus;
  });

  const handleStatusClick = (u) => {
    if (u.status === 'Active') {
      setSuspendingUser(u);
      setSuspensionReason('');
    } else {
      onToggleStatus(u._id, 'Active');
    }
  };

  const handleConfirmSuspension = () => {
    if (!suspensionReason.trim()) {
      alert('A suspension reason is required.');
      return;
    }
    onToggleStatus(suspendingUser._id, 'Suspended', suspensionReason.trim());
    setSuspendingUser(null);
    setSuspensionReason('');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Campus User Management</h1>
          <p className="page-subtitle">Manage student accounts, verify university credentials, and handle trust & safety actions.</p>
        </div>
      </div>

      <div className="controls-bar">
        <div className="search-box">
          <IconSearch size={14} />
          <input 
            type="text" 
            placeholder="Search by student name or university email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="stat-label">Role:</label>
          <select 
            className="custom-select" 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="Student">Student</option>
            <option value="Administrator">Administrator</option>
          </select>
          <label className="stat-label" style={{ marginLeft: '0.5rem' }}>Status:</label>
          <select 
            className="custom-select" 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Member Name & Program</th>
              <th>University Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Domain Verified</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ color: 'var(--text-heading)', fontWeight: 500, marginBottom: '0.25rem' }}>No users found</div>
                  <div style={{ fontSize: '0.75rem' }}>Try adjusting your search query or filter.</div>
                </td>
              </tr>
            ) : (
              filtered.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-heading)' }}>{u.profile?.name || 'Student Member'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {u.profile?.program || 'Undergraduate'} {u.profile?.year ? `• Year ${u.profile.year}` : ''}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{u.email}</td>
                  <td>
                    <span className={`pill ${u.role === 'Administrator' ? 'pill-primary' : 'pill-default'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${u.status === 'Active' ? 'pill-success' : 'pill-danger'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${u.isVerified ? 'pill-default' : 'pill-secondary'}`}>
                      {u.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {u.role !== 'Administrator' ? (
                      <button 
                        className={`btn btn-sm ${u.status === 'Active' ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => handleStatusClick(u)}
                      >
                        {u.status === 'Active' ? (
                          <>
                            <IconSlash size={12} />
                            <span>Suspend</span>
                          </>
                        ) : (
                          <>
                            <IconCheck size={12} />
                            <span>Reactivate</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Protected</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Suspension Modal */}
      {suspendingUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Suspend User: {suspendingUser.profile?.name || suspendingUser.email}</h2>
              <button className="modal-close" onClick={() => setSuspendingUser(null)}><IconX size={15} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                Suspending this user will immediately block their marketplace listings and prevent new rental transactions.
              </p>
              <div className="form-group">
                <label className="form-label">Mandatory Suspension Reason</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="e.g. Terms violation, multiple unreturned rentals, misrepresented item condition..."
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSuspendingUser(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirmSuspension}>Confirm Suspension</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
