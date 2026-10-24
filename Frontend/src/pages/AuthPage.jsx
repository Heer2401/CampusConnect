import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, User, GraduationCap, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [program, setProgram] = useState('');
  const [year, setYear] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        navigate('/marketplace');
      } else {
        await register({ email, password, name, program, year, contactNumber });
        setSuccessMessage('Account created successfully! Please sign in.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '3rem auto' }}>
      <div className="card" style={{ padding: '2.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 1rem',
              background: 'linear-gradient(135deg, var(--accent) 0%, #0ea5e9 100%)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(32, 201, 151, 0.3)',
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
            {isLogin ? 'Welcome back to CampusConnect' : 'Create Your Student Account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            Exclusive smart exchange platform for university students
          </p>
        </div>

        {/* Tab switch */}
        <div
          style={{
            display: 'flex',
            background: '#F1F5F9',
            padding: '0.3rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.75rem',
          }}
        >
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); setSuccessMessage(''); }}
            style={{
              flex: 1,
              padding: '0.55rem',
              border: 'none',
              background: isLogin ? 'white' : 'transparent',
              color: isLogin ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              boxShadow: isLogin ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); setSuccessMessage(''); }}
            style={{
              flex: 1,
              padding: '0.55rem',
              border: 'none',
              background: !isLogin ? 'white' : 'transparent',
              color: !isLogin ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              boxShadow: !isLogin ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#d1fae5', border: '1px solid #6ee7b7', color: '#065f46', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Dhrumil Doshi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Program / Degree</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. M.Sc. IT"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Year / Semester</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Sem 3"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. +91 98765 43210"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                />
                <div className="form-helper">Include country code, e.g. +91 for India</div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">University Email</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="e.g. 202512088@dau.ac.in or student@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="form-helper">
              Must use your official student ID domain (e.g. @dau.ac.in or .edu)
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem' }}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In to Campus' : 'Create Student Account')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          CampusConnect enforces student-only verification for platform safety.
        </div>
      </div>
    </div>
  );
}
