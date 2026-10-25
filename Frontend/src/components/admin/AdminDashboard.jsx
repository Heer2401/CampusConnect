import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, RefreshCw, AlertCircle, LayoutDashboard, ClipboardCheck, Users, Flag, BarChart3, FolderTree } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { useAuth } from '../../context/AuthContext';
import { isPending } from './adminUtils';
import './admin.css';
import OverviewView from './OverviewView';
import ListingModerationView from './ListingModerationView';
import UserManagementView from './UserManagementView';
import CategoryManagementView from './CategoryManagementView';
import DisputeResolutionView from './DisputeResolutionView';
import AnalyticsView from './AnalyticsView';

const TABS = [
  { id: 'overview',   label: 'Overview',            icon: LayoutDashboard },
  { id: 'listings',   label: 'Listing Moderation',  icon: ClipboardCheck },
  { id: 'users',      label: 'User Management',     icon: Users },
  { id: 'categories', label: 'Category Taxonomy',   icon: FolderTree },
  { id: 'disputes',   label: 'Disputes & Reports',  icon: Flag },
  { id: 'analytics',  label: 'Platform Analytics',  icon: BarChart3 },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Active tab lives in the URL (/admin, /admin/listings, ...) so refresh & back work.
  const urlTab = location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
  const activeTab = TABS.some(t => t.id === urlTab) ? urlTab : 'overview';
  const setActiveTab = (id) => navigate(id === 'overview' ? '/admin' : `/admin/${id}`);

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
        adminApi.getListings({ queueType: 'moderation_needed' }).catch(err => {
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

  // 3. Live User Moderation (Status & Verification toggle)
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

  const handleToggleVerification = async (userId, currentVerified) => {
    try {
      const newVerified = !currentVerified;
      await adminApi.updateUserStatus(userId, null, '', newVerified);
      showToast(`User ${newVerified ? 'marked as verified' : 'unverified'}`, 'success');
      const updatedUsers = await adminApi.getUsers();
      setUsers(updatedUsers);
    } catch (err) {
      showToast(`Verification update failed: ${err.message}`, 'danger');
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


  const pendingCount = listings.filter(l =>
    (l.reports && l.reports.length > 0) ||
    (l.moderationFlags && l.moderationFlags.length > 0) ||
    isPending(l.status)
  ).length;
  const adminName = user?.profile?.name || user?.name || user?.email?.split('@')[0] || 'Administrator';

  return (
    <div className="adm">
      {/* Hero header — same treatment as the Profile / Sustainability banners */}
      <section className="adm-hero">
        <div>
          <div className="adm-hero-eyebrow"><ShieldCheck size={14} /> Admin Console</div>
          <h1>Welcome back, {adminName}</h1>
          <p>Moderate listings, manage members and resolve disputes to keep the campus marketplace safe and trusted.</p>
        </div>

        <div className="adm-hero-actions">
          <button
            type="button"
            className="adm-live"
            onClick={() => fetchAllLiveData(true)}
            title={serverConnected ? `Connected to backend. Last sync: ${lastSynced ? lastSynced.toLocaleTimeString() : 'N/A'}` : 'Disconnected. Click to retry'}
          >
            <span className={`adm-dot ${serverConnected ? 'online' : 'offline'}`} />
            {isSyncing ? 'Syncing…' : serverConnected ? 'Live backend' : 'Disconnected'}
          </button>
          <button
            type="button"
            className="adm-btn ghost-light"
            onClick={() => fetchAllLiveData(true)}
            disabled={isSyncing}
            title="Reload live data from server"
          >
            <RefreshCw size={15} className={isSyncing ? 'spin' : ''} />
            Sync
          </button>
        </div>
      </section>

      {/* Tabs */}
      <nav className="adm-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={`adm-tab ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
            {id === 'listings' && pendingCount > 0 && <span className="adm-count">{pendingCount}</span>}
            {id === 'disputes' && metrics.openDisputes > 0 && <span className="adm-count danger">{metrics.openDisputes}</span>}
          </button>
        ))}
      </nav>

      {/* Connection warning */}
      {!serverConnected && !loading && (
        <div className="adm-alert danger" role="alert">
          <span>
            <AlertCircle size={18} />
            Backend server unreachable: {errorMessage || 'Could not connect to port 5000'}. Verify the backend server is running.
          </span>
          <button type="button" className="adm-btn sm danger" onClick={() => fetchAllLiveData()}>
            Retry connection
          </button>
        </div>
      )}

      {/* Active view */}
      {loading ? (
        <div className="adm-loading" role="status">
          <div className="adm-spinner" />
          <b>Loading live backend data</b>
          <span>Retrieving records from the CampusConnect API</span>
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
              categories={categories}
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
              onToggleVerification={handleToggleVerification}
              onRefresh={() => fetchAllLiveData(true)}
              loading={isSyncing}
            />
          )}
          {activeTab === 'categories' && (
            <CategoryManagementView
              categories={categories}
              onReload={() => fetchAllLiveData(true)}
              onToast={showToast}
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

      {/* Toasts */}
      <div className="adm-toasts" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`adm-toast ${t.type}`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
