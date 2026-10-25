import React, { useState } from 'react';
import { Search, Ban, Check, Users, ShieldCheck } from 'lucide-react';
import AdminModal from './AdminModal';
import { isAdminRole, initials } from './adminUtils';

export default function UserManagementView({ users = [], onToggleStatus, onToggleVerification }) {
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [suspendingUser, setSuspendingUser] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const term = searchTerm.trim().toLowerCase();
  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' ||
      (roleFilter === 'Administrator' ? isAdminRole(u.role) : u.role === roleFilter);
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchSearch = !term ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.profile?.name || '').toLowerCase().includes(term);
    return matchRole && matchStatus && matchSearch;
  });

  const handleStatusClick = (u) => {
    if (u.status === 'Active') {
      setSuspendingUser(u);
      setSuspensionReason('');
      setReasonError('');
    } else {
      onToggleStatus(u._id, 'Active');
    }
  };

  const closeSuspend = () => { setSuspendingUser(null); setSuspensionReason(''); setReasonError(''); };

  const handleConfirmSuspension = () => {
    if (!suspensionReason.trim()) {
      setReasonError('A suspension reason is required.');
      return;
    }
    onToggleStatus(suspendingUser._id, 'Suspended', suspensionReason.trim());
    closeSuspend();
  };

  return (
    <div>
      <div className="adm-section-head">
        <h2>Campus User Management</h2>
        <p>Manage student accounts, verify university credentials, and handle trust &amp; safety actions.</p>
      </div>

      <div className="adm-toolbar">
        <label className="adm-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by student name or university email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search users"
          />
        </label>
        <div className="adm-filters">
          <label className="adm-filter">
            Role
            <select className="adm-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="Student">Student</option>
              <option value="Administrator">Administrator</option>
            </select>
          </label>
          <label className="adm-filter">
            Status
            <select className="adm-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </label>
        </div>
      </div>

      <div className="adm-table-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Member Name &amp; Program</th>
                <th>University Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Domain Verified</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="adm-empty">
                      <div className="adm-empty-icon"><Users size={24} /></div>
                      <b>No users found</b>
                      <span>Try adjusting your search query or filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(u => {
                  const name = u.profile?.name || 'Student Member';
                  const admin = isAdminRole(u.role);
                  return (
                    <tr key={u._id}>
                      <td>
                        <div className="adm-person">
                          <div className="adm-avatar">{initials(name)}</div>
                          <div>
                            <div className="adm-cell-title">{name}</div>
                            <div className="adm-cell-sub">
                              {u.profile?.program || 'Undergraduate'}{u.profile?.year ? ` • Year ${u.profile.year}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td><span className={`adm-pill ${admin ? 'teal' : 'gray'}`}>{admin ? 'Administrator' : u.role}</span></td>
                      <td><span className={`adm-pill ${u.status === 'Active' ? 'green' : 'red'}`}>{u.status}</span></td>
                      <td>
                        <span className={`adm-pill ${u.isVerified ? 'blue' : 'gray'}`}>
                          {u.isVerified && <ShieldCheck size={12} />}
                          {u.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="right">
                        {!admin ? (
                          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className={`adm-btn sm ${u.status === 'Active' ? 'danger' : 'success'}`}
                              onClick={() => handleStatusClick(u)}
                            >
                              {u.status === 'Active' ? <><Ban size={14} /> Suspend</> : <><Check size={14} /> Reactivate</>}
                            </button>
                            <button
                              type="button"
                              className="adm-btn sm secondary"
                              title={u.isVerified ? 'Revoke verification' : 'Grant verification'}
                              onClick={() => onToggleVerification && onToggleVerification(u._id, u.isVerified)}
                            >
                              <ShieldCheck size={14} /> {u.isVerified ? 'Unverify' : 'Verify'}
                            </button>
                          </div>
                        ) : (
                          <span className="adm-cell-sub">Protected</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {suspendingUser && (
        <AdminModal
          title={`Suspend User: ${suspendingUser.profile?.name || suspendingUser.email}`}
          onClose={closeSuspend}
          footer={
            <>
              <button type="button" className="adm-btn secondary" onClick={closeSuspend}>Cancel</button>
              <button type="button" className="adm-btn danger" onClick={handleConfirmSuspension}>Confirm Suspension</button>
            </>
          }
        >
          <p className="adm-note">
            Suspending this user will immediately block their marketplace listings and prevent new rental transactions.
          </p>
          <div className="adm-field">
            <label className="adm-label" htmlFor="adm-suspend-reason">Mandatory suspension reason</label>
            <textarea
              id="adm-suspend-reason"
              className={`adm-textarea ${reasonError ? 'invalid' : ''}`}
              placeholder="e.g. Terms violation, multiple unreturned rentals, misrepresented item condition…"
              value={suspensionReason}
              onChange={(e) => { setSuspensionReason(e.target.value); if (reasonError) setReasonError(''); }}
              autoFocus
            />
            {reasonError && <div className="adm-error" role="alert">{reasonError}</div>}
          </div>
        </AdminModal>
      )}
    </div>
  );
}
