import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Plus, Trash2, CheckCircle, Smartphone, Building, ShieldCheck, AlertCircle } from 'lucide-react';

export default function PaymentMethodsPage() {
  const { token } = useAuth();
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('upi');
  const [label, setLabel] = useState('');
  const [upiId, setUpiId] = useState('');
  const [last4, setLast4] = useState('');
  const [bankName, setBankName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchMethods = async () => {
    try {
      const res = await fetch('/api/users/me/payment-methods', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMethods(data);
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, [token]);

  const handleAddMethod = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const details = {};
    if (type === 'upi') {
      if (!upiId) return setError('Please enter your UPI ID');
      details.upiId = upiId;
    } else if (type === 'card') {
      if (!last4 || last4.length !== 4) return setError('Please enter the last 4 digits of your card');
      details.last4 = last4;
    } else if (type === 'bank_transfer') {
      if (!bankName) return setError('Please enter your bank name');
      details.bankName = bankName;
    }

    try {
      const res = await fetch('/api/users/me/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, label, details, isDefault }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add payment method');
      }

      setSuccess('Payment method added successfully');
      setLabel('');
      setUpiId('');
      setLast4('');
      setBankName('');
      setShowAddForm(false);
      fetchMethods();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await fetch(`/api/users/me/payment-methods/${id}/default`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchMethods();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this payment method?')) return;
    try {
      const res = await fetch(`/api/users/me/payment-methods/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchMethods();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="card-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
            Payment Methods
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginTop: '0.25rem' }}>
            Store and manage payment methods used for campus marketplace & rental transactions
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-accent"
        >
          <Plus size={16} />
          {showAddForm ? 'Cancel' : 'Add Payment Method'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Add Payment Form */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: '2rem', border: '2px solid var(--accent)' }}>
          <h2 className="card-title" style={{ marginBottom: '1.25rem' }}>
            Add New Payment Method
          </h2>

          <form onSubmit={handleAddMethod}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Payment Type</label>
                <select
                  className="form-select"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="card">Debit / Credit Card</option>
                  <option value="bank_transfer">Bank Transfer (IMPS/NEFT)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Account Label</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. My Primary UPI or College Account"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
            </div>

            {type === 'upi' && (
              <div className="form-group">
                <label className="form-label">UPI ID / VPA</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="username@okhdfcbank or 9876543210@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
            )}

            {type === 'card' && (
              <div className="form-group">
                <label className="form-label">Card Last 4 Digits</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  className="form-input"
                  placeholder="e.g. 4242"
                  value={last4}
                  onChange={(e) => setLast4(e.target.value)}
                />
              </div>
            )}

            {type === 'bank_transfer' && (
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. State Bank of India"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                <span>Set as default payment method</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Method
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Methods List */}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading payment methods...</p>
      ) : methods.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <CreditCard size={44} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            No payment methods added yet
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Add a UPI ID or card to quickly send or receive rental security deposits and payments.
          </p>
          <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
            <Plus size={16} /> Add Your First Method
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {methods.map((method) => (
            <div
              key={method._id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderLeft: method.isDefault ? '4px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    background: method.type === 'upi' ? 'var(--accent-light)' : '#E0F2FE',
                    color: method.type === 'upi' ? 'var(--accent)' : '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {method.type === 'upi' ? <Smartphone size={22} /> : method.type === 'card' ? <CreditCard size={22} /> : <Building size={22} />}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{method.label}</h3>
                    {method.isDefault && (
                      <span
                        style={{
                          background: 'var(--accent-light)',
                          color: 'var(--accent)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}
                      >
                        Default
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    {method.type === 'upi' && `UPI: ${method.details?.upiId}`}
                    {method.type === 'card' && `Card ending in •••• ${method.details?.last4}`}
                    {method.type === 'bank_transfer' && `Bank: ${method.details?.bankName}`}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {!method.isDefault && (
                  <button
                    onClick={() => handleSetDefault(method._id)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(method._id)}
                  className="btn btn-danger"
                  style={{ padding: '0.45rem 0.65rem' }}
                  title="Remove Method"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
