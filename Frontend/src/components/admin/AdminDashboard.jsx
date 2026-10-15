import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../services/adminApi';
import { IconSync, IconAlertCircle } from '../common/Icons';
import OverviewView from './OverviewView';
import ListingModerationView from './ListingModerationView';
import UserManagementView from './UserManagementView';
import DisputeResolutionView from './DisputeResolutionView';
import AnalyticsView from './AnalyticsView';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Live Backend State
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeStudents: 0,
    suspendedUsers: 0,
    totalListings: 0,
    pendingApprovals: 0,
    approvedListings: 0,
    openDisputes: 0,
    resolvedDisputes: 0
  });

  const [demandTrends, setDemandTrends] = useState({
    categories: [],
    weeklyVolume: []
  });

  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [categories, setCategories] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  // Primary Data Loader: Connects to live backend API
  const fetchAllLiveData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsSyncing(true);
    setErrorMessage(null);

    try {
      // 1. Ensure authenticated session with backend
      await adminApi.ensureAdminAuth();

      // 2. Query live data concurrently across all endpoints
      const [analyticsData, pendingListingsData, usersData, disputesData, categoriesData] = await Promise.all([
        adminApi.getAnalyticsOverview().catch(err => {
          console.warn('Live Analytics API error:', err.message);
          return null;
        }),
        adminApi.getListings({ status: 'pending' }).catch(err => {
          console.warn('Live Listings API error:', err.message);
          return [];
        }),
        adminApi.getUsers().catch(err => {
          console.warn('Live Users API error:', err.message);
          return [];
        }),
        adminApi.getDisputes().catch(err => {
          console.warn('Live Disputes API error:', err.message);
          return [];
        }),
        adminApi.getCategories().catch(err => {
          console.warn('Live Categories API error:', err.message);
          return [];
        })
      ]);

      if (analyticsData) {
        if (analyticsData.metrics) setMetrics(analyticsData.metrics);
        if (analyticsData.demandTrends) setDemandTrends(analyticsData.demandTrends);
      }

      setListings(Array.isArray(pendingListingsData) ? pendingListingsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setDisputes(Array.isArray(disputesData) ? disputesData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);

      setServerConnected(true);
      setLastSynced(new Date());

      if (isSilent) {
        showToast('Dashboard synchronized with backend', 'success');
      }
    } catch (err) {
      console.error('Failed to load live data:', err);
      setServerConnected(false);
      setErrorMessage(err.message || 'Unable to connect to live backend API');
      showToast(`Backend connection issue: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAllLiveData();
  }, [fetchAllLiveData]);

  // 1. Live Listing Approval
  const handleApproveListing = async (listingId) => {
    try {
      await adminApi.approveListing(listingId);
      showToast('Listing approved and published to live marketplace', 'success');
      const [updatedListings, analyticsData] = await Promise.all([
        adminApi.getListings({ status: 'pending' }),
        adminApi.getAnalyticsOverview()
      ]);
      setListings(updatedListings);
      if (analyticsData?.metrics) setMetrics(analyticsData.metrics);
      if (analyticsData?.demandTrends) setDemandTrends(analyticsData.demandTrends);
    } catch (err) {
      showToast(`Approval failed: ${err.message}`, 'danger');
    }
  };

  // 2. Live Listing Rejection
  const handleRejectListing = async (listingId, reason) => {
    try {
      await adminApi.rejectListing(listingId, reason);
      showToast(`Listing rejected: ${reason}`, 'danger');
      const [updatedListings, analyticsData] = await Promise.all([
        adminApi.getListings({ status: 'pending' }),
        adminApi.getAnalyticsOverview()
      ]);
      setListings(updatedListings);
      if (analyticsData?.metrics) setMetrics(analyticsData.metrics);
    } catch (err) {
      showToast(`Rejection failed: ${err.message}`, 'danger');
    }
  };

  // 3. Live User Moderation (Status toggle)
  const handleToggleUserStatus = async (userId, newStatus, suspensionReason) => {
    try {
      await adminApi.updateUserStatus(userId, newStatus, suspensionReason);
      showToast(`User status updated to ${newStatus}`, newStatus === 'Active' ? 'success' : 'warning');
      const [updatedUsers, analyticsData] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getAnalyticsOverview()
      ]);
      setUsers(updatedUsers);
      if (analyticsData?.metrics) setMetrics(analyticsData.metrics);
    } catch (err) {
      showToast(`Status update failed: ${err.message}`, 'danger');
    }
  };

  // 4. Live Dispute Resolution
  const handleResolveDispute = async (disputeId, status, actionTaken, notes) => {
    try {
      await adminApi.resolveDispute(disputeId, status, actionTaken, notes);
      showToast(`Dispute resolved as ${status} (${actionTaken})`, 'success');
      const [updatedDisputes, analyticsData] = await Promise.all([
        adminApi.getDisputes(),
        adminApi.getAnalyticsOverview()
      ]);
      setDisputes(updatedDisputes);
      if (analyticsData?.metrics) setMetrics(analyticsData.metrics);
    } catch (err) {
      showToast(`Dispute resolution failed: ${err.message}`, 'danger');
    }
  };


  const pendingCount = listings.filter(l => l.status === 'pending').length;

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="topbar">
        <div className="brand-section">
          <div className="brand-logo">CC</div>
          <div className="brand-title">CampusConnect</div>
          <span className="brand-badge">Admin</span>
        </div>

        <nav className="nav-tabs" aria-label="Admin Navigation">
          <button 
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span>Overview</span>
          </button>
          <button 
            className={`nav-tab ${activeTab === 'listings' ? 'active' : ''}`}
            onClick={() => setActiveTab('listings')}
          >
            <span>Listing Approvals</span>
            {pendingCount > 0 && <span className="badge-count">{pendingCount}</span>}
          </button>
          <button 
            className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span>User Management</span>
          </button>
          <button 
            className={`nav-tab ${activeTab === 'disputes' ? 'active' : ''}`}
            onClick={() => setActiveTab('disputes')}
          >
            <span>Disputes & Reports</span>
            {metrics.openDisputes > 0 && (
              <span className="badge-count" style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}>
                {metrics.openDisputes}
              </span>
            )}
          </button>
          <button 
            className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <span>Platform Analytics</span>
          </button>
        </nav>

        <div className="topbar-actions">
          {/* Live Backend Connection Indicator */}
          <div 
            className="connection-indicator"
            onClick={() => fetchAllLiveData(true)}
            style={{ cursor: 'pointer' }}
            title={serverConnected ? `Connected to Backend. Last sync: ${lastSynced ? lastSynced.toLocaleTimeString() : 'N/A'}` : 'Disconnected. Click to retry'}
          >
            <span className={`indicator-dot ${serverConnected ? 'online' : 'offline'}`} />
            <span>{isSyncing ? 'Syncing' : serverConnected ? 'Live Backend' : 'Disconnected'}</span>
          </div>

          <button 
            className="btn btn-sm btn-secondary" 
            onClick={() => fetchAllLiveData(true)} 
            disabled={isSyncing}
            title="Reload live data from server"
          >
            <IconSync spinning={isSyncing} size={13} />
            <span>Sync</span>
          </button>


          <div className="user-profile">
            <div className="user-avatar">KV</div>
            <div className="user-details">
              <span className="user-name">Kajal Varlani</span>
              <span className="user-role">Administrator</span>
            </div>
          </div>
        </div>
      </header>

      {/* Connection Warning Banner if Server Unreachable */}
      {!serverConnected && !loading && (
        <div style={{
          background: 'var(--danger-subtle)',
          borderBottom: '1px solid var(--danger-border)',
          padding: '0.65rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fca5a5',
          fontSize: '0.8rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconAlertCircle size={15} />
            <span>Backend Server Unreachable: {errorMessage || 'Could not connect to port 5000'}. Verify backend server is running.</span>
          </div>
          <button className="btn btn-sm btn-danger" onClick={() => fetchAllLiveData()}>
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '6rem 2rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'inline-flex', marginBottom: '1rem', color: 'var(--text-heading)' }}>
              <IconSync spinning={true} size={28} />
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.35rem' }}>Loading live backend data</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Retrieving records from CampusConnect API</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewView 
                metrics={metrics} 
                demandTrends={demandTrends} 
                onNavigate={(tab) => setActiveTab(tab)}
                onRefresh={() => fetchAllLiveData(true)}
                loading={isSyncing}
              />
            )}
            {activeTab === 'listings' && (
              <ListingModerationView 
                listings={listings} 
                onApprove={handleApproveListing}
                onReject={handleRejectListing}
                onRefresh={() => fetchAllLiveData(true)}
                loading={isSyncing}
              />
            )}
            {activeTab === 'users' && (
              <UserManagementView 
                users={users} 
                onToggleStatus={handleToggleUserStatus}
                onRefresh={() => fetchAllLiveData(true)}
                loading={isSyncing}
              />
            )}
            {activeTab === 'disputes' && (
              <DisputeResolutionView 
                disputes={disputes} 
                onResolve={handleResolveDispute}
                onRefresh={() => fetchAllLiveData(true)}
                loading={isSyncing}
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsView 
                demandTrends={demandTrends} 
                metrics={metrics}
                loading={isSyncing}
              />
            )}
          </>
        )}
      </main>

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
