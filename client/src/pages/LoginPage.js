import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Alert } from '../components/dashboard/UI';
import { Leaf } from 'lucide-react';
import './AuthPages.css';

export default function LoginPage() {
  const { login } = useAuth();
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
      const user = await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-panel auth-panel-brand">
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

      <div className="auth-panel auth-panel-form">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your Abariisa account</p>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

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

            <Button type="submit" size="lg" loading={loading} style={{ width: '100%', marginTop: '1.5rem' }}>
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
  );
}
