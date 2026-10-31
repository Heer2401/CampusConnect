import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  Lock,
  User,
  UserPlus,
  Eye,
  EyeOff,
  ShoppingBag,
  Calendar,
  ArrowLeftRight,
  Gift,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [program, setProgram] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        const loggedUser = await login(email, password);
        if (loggedUser?.role === 'Administrator' || loggedUser?.role === 'Admin') {
          navigate('/admin');
        } else {
          navigate('/marketplace');
        }
      } else {
        await register({ email, password, name, program, year });
        setSuccessMessage('Account created successfully! Please sign in with your credentials.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setInfoMessage('To reset your university credentials, please use your official student portal or contact IT student support at support@dau.ac.in.');
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-layout-container">
        {/* ── Left Hero Column ──────────────────────────────────────── */}
        <div className="auth-left-hero">
          {/* Brand Logo & Name */}
          <div className="auth-brand-header">
            <div className="auth-brand-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 8.5C17.8 5.8 15.1 4 12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C15.5 20 18.5 17.8 19.5 14.6"
                  stroke="white"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <circle cx="19" cy="8.5" r="2.2" fill="white" />
              </svg>
            </div>
            <span className="auth-brand-name">CampusConnect</span>
          </div>

          {/* Subtitle tag */}
          <div className="auth-hero-tag">
            &mdash; A SMARTER CAMPUS COMMUNITY &mdash;
          </div>

          {/* Main Title */}
          <h1 className="auth-hero-title">
            Your Campus.<br />
            Your <span className="auth-hero-title-accent">Marketplace.</span>
          </h1>

          {/* Subtext */}
          <p className="auth-hero-subtitle">
            Buy, rent, swap or give away essentials with students on your campus.
          </p>

          {/* 4 Feature Cards (Floating 2x2 grid with tilt & accents) */}
          <div className="auth-features-wrapper">
            {/* Playful dashed swirl SVG in background */}
            <svg
              className="auth-features-dashed-curve"
              viewBox="0 0 440 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M 10,160 C 20,220 120,230 200,195 C 320,140 430,170 420,70"
                stroke="#38bdf8"
                strokeWidth="1.8"
                strokeDasharray="5 5"
                strokeOpacity="0.55"
              />
            </svg>

            {/* Sparkle rays top right */}
            <div className="auth-sparkle-rays auth-sparkle-rays--right">
              <span className="ray ray-1" />
              <span className="ray ray-2" />
              <span className="ray ray-3" />
            </div>

            <div className="auth-features-grid">
              {/* Card 1: Buy */}
              <div className="auth-feature-pill auth-feature-pill--buy">
                <div className="auth-feature-icon-box auth-feature-icon-box--buy">
                  <ShoppingBag size={20} />
                </div>
                <div className="auth-feature-info">
                  <span className="auth-feature-name">Buy</span>
                  <span className="auth-feature-desc">Find items you need</span>
                </div>
              </div>

              {/* Card 2: Rent */}
              <div className="auth-feature-pill auth-feature-pill--rent">
                <div className="auth-feature-icon-box auth-feature-icon-box--rent">
                  <Calendar size={20} />
                </div>
                <div className="auth-feature-info">
                  <span className="auth-feature-name">Rent</span>
                  <span className="auth-feature-desc">Use for the time you need</span>
                </div>
              </div>

              {/* Card 3: Swap */}
              <div className="auth-feature-pill auth-feature-pill--swap">
                <div className="auth-feature-icon-box auth-feature-icon-box--swap">
                  <ArrowLeftRight size={20} />
                </div>
                <div className="auth-feature-info">
                  <span className="auth-feature-name">Swap</span>
                  <span className="auth-feature-desc">Exchange with peers</span>
                </div>
              </div>

              {/* Card 4: Free */}
              <div className="auth-feature-pill auth-feature-pill--free">
                <div className="auth-feature-icon-box auth-feature-icon-box--free">
                  <Gift size={20} />
                </div>
                <div className="auth-feature-info">
                  <span className="auth-feature-name">Free</span>
                  <span className="auth-feature-desc">Give away or find for free</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Auth Card Column ────────────────────────────────── */}
        <div className="auth-right-panel">
          <div className="auth-card">
            {/* Top Segmented Tab Switcher */}
            <div className="auth-tabs-segmented">
              <button
                type="button"
                className={`auth-tab-btn ${isLogin ? 'active' : ''}`}
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                  setSuccessMessage('');
                  setInfoMessage('');
                }}
              >
                <User size={16} />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                className={`auth-tab-btn ${!isLogin ? 'active' : ''}`}
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                  setSuccessMessage('');
                  setInfoMessage('');
                }}
              >
                <UserPlus size={16} />
                <span>Create Account</span>
              </button>
            </div>

            {/* Header with Title & playful sparkle accent */}
            <div className="auth-card-header">
              <div className="auth-title-container">
                <h2 className="auth-card-title">
                  {isLogin ? 'Welcome back' : 'Create Account'}
                </h2>
                {isLogin && (
                  <div className="auth-title-sparkles">
                    <span className="spark-line spark-1" />
                    <span className="spark-line spark-2" />
                    <span className="spark-line spark-3" />
                  </div>
                )}
              </div>
              <p className="auth-card-subtitle">
                {isLogin
                  ? 'Sign in with your university email to continue.'
                  : 'Join your campus marketplace today.'}
              </p>
            </div>

            {/* Alerts */}
            {error && (
              <div className="auth-alert auth-alert-danger">
                <AlertCircle size={18} className="auth-alert-icon" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="auth-alert auth-alert-success">
                <CheckCircle2 size={18} className="auth-alert-icon" />
                <span>{successMessage}</span>
              </div>
            )}

            {infoMessage && (
              <div className="auth-alert auth-alert-info">
                <Info size={18} className="auth-alert-icon" />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <>
                  <div className="auth-form-group">
                    <label className="auth-form-label">Full Name</label>
                    <div className="auth-input-wrapper">
                      <User size={18} className="auth-input-icon" />
                      <input
                        type="text"
                        required
                        className="auth-input"
                        placeholder="e.g. Alex Johnson"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="auth-form-row">
                    <div className="auth-form-group">
                      <label className="auth-form-label">Program / Degree</label>
                      <div className="auth-input-wrapper">
                        <GraduationCap size={18} className="auth-input-icon" />
                        <input
                          type="text"
                          required
                          className="auth-input"
                          placeholder="e.g. M.Sc. IT"
                          value={program}
                          onChange={(e) => setProgram(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="auth-form-group">
                      <label className="auth-form-label">Year / Semester</label>
                      <div className="auth-input-wrapper">
                        <input
                          type="text"
                          required
                          className="auth-input auth-input--no-icon"
                          placeholder="e.g. Sem 3"
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div className="auth-form-group">
                <label className="auth-form-label">University Email</label>
                <div className="auth-input-wrapper">
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    type="email"
                    required
                    className="auth-input"
                    placeholder="e.g. 202512088@dau.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="auth-form-group">
                <label className="auth-form-label">Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="auth-input auth-input--has-right"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {isLogin && (
                  <div className="auth-forgot-row">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="auth-forgot-link"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="auth-submit-btn"
              >
                <span>
                  {loading
                    ? 'Processing...'
                    : isLogin
                    ? 'Sign In to CampusConnect'
                    : 'Create Account'}
                </span>
                <ArrowRight size={18} className="auth-submit-arrow" />
              </button>
            </form>

            {/* Bottom Account Switch Link */}
            <div className="auth-bottom-switch">
              {isLogin ? (
                <>
                  New to CampusConnect?{' '}
                  <button
                    type="button"
                    className="auth-switch-link"
                    onClick={() => {
                      setIsLogin(false);
                      setError('');
                      setSuccessMessage('');
                      setInfoMessage('');
                    }}
                  >
                    Create an account &rarr;
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="auth-switch-link"
                    onClick={() => {
                      setIsLogin(true);
                      setError('');
                      setSuccessMessage('');
                      setInfoMessage('');
                    }}
                  >
                    Sign In &rarr;
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
