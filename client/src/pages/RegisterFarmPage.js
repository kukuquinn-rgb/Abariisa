import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Alert } from '../components/dashboard/UI';
import { Leaf } from 'lucide-react';
import './AuthPages.css';

export default function RegisterFarmPage() {
  const { registerFarm } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    farmName: '', district: '', village: '',
    name: '', email: '', phone: '', password: '', confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.farmName.trim()) errs.farmName = 'Farm name is required';
    if (!form.name.trim()) errs.name = 'Your name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setApiError('');
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      await registerFarm(payload);
      navigate('/dashboard');
    } catch (err) {
      setApiError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div
        className="auth-panel auth-panel-brand"
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/farm.jpg)` }}
      >
        <div className="auth-brand-content">
          <div className="auth-logo"><Leaf size={40} color="#fff" /></div>
          <h1 className="auth-brand-title">Register your farm</h1>
          <p className="auth-brand-tagline">Smart Farm Management System</p>
          <p className="auth-brand-desc">
            Set up your farm on Abariisa. You'll be its manager, and you can invite your workers once you're in.
          </p>
          <ul className="auth-feature-list">
            <li>✓ Your farm's data stays private to your farm</li>
            <li>✓ Invite workers with a link</li>
            <li>✓ Livestock, tasks and attendance in one place</li>
          </ul>
        </div>
      </div>

      <div
        className="auth-panel auth-panel-form"
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/farm.jpg)` }}
      >
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Register your farm</h2>
            <p>Create a farm and your manager account</p>
          </div>

          {apiError && <Alert variant="danger">{apiError}</Alert>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-fields">
              <Input label="Farm name" name="farmName" value={form.farmName} onChange={handleChange}
                placeholder="e.g. Kato's Farm" required error={errors.farmName} />
              <Input label="District" name="district" value={form.district} onChange={handleChange}
                placeholder="e.g. Mbarara" />
              <Input label="Village" name="village" value={form.village} onChange={handleChange}
                placeholder="e.g. Rwanyamahembe" />

              <Input label="Your full name" name="name" value={form.name} onChange={handleChange}
                placeholder="e.g. Kukunda Linda" required error={errors.name} autoComplete="name" />
              <Input label="Email address" type="email" name="email" value={form.email}
                onChange={handleChange} placeholder="you@example.com" required error={errors.email}
                autoComplete="email" />
              <Input label="Phone number" name="phone" value={form.phone} onChange={handleChange}
                placeholder="+256 700 000 000" autoComplete="tel" />

              <Input label="Password" type="password" name="password" value={form.password}
                onChange={handleChange} placeholder="Min. 6 characters" required error={errors.password}
                autoComplete="new-password" />
              <Input label="Confirm password" type="password" name="confirmPassword"
                value={form.confirmPassword} onChange={handleChange} placeholder="Repeat your password"
                required error={errors.confirmPassword} autoComplete="new-password" />
            </div>

            <Button type="submit" size="lg" loading={loading} style={{ width: '100%', marginTop: '1.5rem' }}>
              Create farm
            </Button>
          </form>

          <p className="auth-switch">
            Have an invite from a farm? <Link to="/register">Join a farm</Link>
            <br />
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
