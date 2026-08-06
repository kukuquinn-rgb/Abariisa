import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Alert } from '../components/dashboard/UI';
import { Leaf } from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import api from '../utils/api';
import farmPhoto from '../assets/farm.jpg';
import './AuthPages.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/google', {
        credential: credentialResponse.credential,
      });
      loginWithToken(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="auth-page">

        {/* Left brand panel — farm photo with brown overlay */}
        <div
          className="auth-panel auth-panel-brand"
          style={{
            backgroundImage: `url(${farmPhoto})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="auth-brand-content">
            <div className="auth-logo">
              <Leaf size={40} color="#fff" />
            </div>
            <h1 className="auth-brand-title">Abariisa</h1>
            <p className="auth-brand-tagline">Smart Farm Management System</p>
            <p className="auth-brand-desc">
              Manage livestock, monitor workers, track attendance, and predict operational risks — all in one place.
            </p>
            <ul className="auth-feature-list">
              <li>✓ Centralised livestock records</li>
              <li>✓ Worker trust scoring</li>
              <li>✓ Real-time task monitoring</li>
              <li>✓ Predictive risk alerts</li>
            </ul>
          </div>
        </div>

        {/* Right form panel */}
        <div className="auth-panel auth-panel-form">
          <div className="auth-form-container">
            <div className="auth-form-header">
              <h2>Welcome back</h2>
              <p>Sign in to your Abariisa account</p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Google Sign-In button */}
            <div className="google-signin-wrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed. Please try again.')}
                width="100%"
                text="signin_with"
                shape="rectangular"
                logo_alignment="left"
                theme="outline"
              />
            </div>

            {/* Divider */}
            <div className="auth-divider">
              <span>or sign in with email</span>
            </div>

            {/* Email/password form */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-fields">
                <Input
                  label="Email address"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
                <Input
                  label="Password"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                loading={loading}
                style={{ width: '100%', marginTop: '1.5rem' }}
              >
                Sign in
              </Button>
            </form>

            <p className="auth-switch">
              Don't have an account?{' '}
              <Link to="/register">Register here</Link>
            </p>
          </div>
        </div>

      </div>
    </GoogleOAuthProvider>
  );
}