import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Select, Alert, Badge, Spinner } from '../components/dashboard/UI';
import { Leaf, Eye } from 'lucide-react';
import api from '../utils/api';
import './AuthPages.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'worker', phone: '', position: '', department: '', inviteCode: inviteCode || ''
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteState, setInviteState] = useState('checking'); // 'checking', 'valid', 'invalid'
  const [inviteData, setInviteData] = useState(null);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: '' }));
  };

  useEffect(() => {
    if (!inviteCode) {
      setInviteState('invalid');
      return;
    }
    const validateInvite = async () => {
      try {
        const { data } = await api.get(`/invites/${inviteCode}/validate`);
        setInviteData(data);
        setInviteState('valid');
        if (data.email) {
          setForm(p => ({ ...p, email: data.email }));
        }
      } catch (err) {
        setInviteState('invalid');
        setApiError(err.response?.data?.message || 'Invalid or expired invite');
      }
    };
    validateInvite();
  }, [inviteCode]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
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
      await register(payload);
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
          <h1 className="auth-brand-title">Join Abariisa</h1>
          <p className="auth-brand-tagline">Smart Farm Management System</p>
          <p className="auth-brand-desc">
            Create your account to start managing your farm operations intelligently.
          </p>
        </div>
      </div>

      <div
        className="auth-panel auth-panel-form"
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/farm.jpg)` }}
      >
        <div className="auth-form-container">
          <div className="auth-form-header">
            {inviteState === 'checking' ? (
              <>
                <Spinner />
                <p>Checking invite...</p>
              </>
            ) : inviteState === 'valid' ? (
              <>
                <h2>You're invited!</h2>
                <p>Registering as a view-only collaborator for {inviteData?.invitedByName}'s farm</p>
              </>
            ) : (
              <>
                <h2>Create account</h2>
                <p>Get started with Abariisa today</p>
              </>
            )}
          </div>

          {inviteState === 'valid' && (
            <Alert variant="success">
              You're registering as a view-only collaborator for {inviteData?.invitedByName}'s farm
              <Badge variant="info"><Eye size={12} /> Read-only access</Badge>
            </Alert>
          )}

          {inviteState === 'invalid' && inviteCode && (
            <Alert variant="warning">
              This invite code is invalid or has expired. You can still register normally to create an account.
            </Alert>
          )}

          {apiError && <Alert variant="danger">{apiError}</Alert>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-fields">
              <Input label="Full name" name="name" value={form.name} onChange={handleChange}
                placeholder="e.g. Kukunda Linda" required error={errors.name} autoComplete="name" />

              <Input label="Email address" type="email" name="email" value={form.email}
                onChange={handleChange} placeholder="you@example.com" required error={errors.email}
                autoComplete="email" disabled={inviteState === 'valid' && inviteData?.email} />

              {inviteState !== 'valid' && (
                <Select label="Role" name="role" value={form.role} onChange={handleChange} required>
                  <option value="worker">Farm Worker</option>
                  <option value="manager">Farm Manager</option>
                </Select>
              )}

              <Input label="Phone number" name="phone" value={form.phone} onChange={handleChange}
                placeholder="+256 700 000 000" autoComplete="tel" />

              {form.role === 'worker' && inviteState !== 'valid' && (
                <>
                  <Input label="Position / Job title" name="position" value={form.position}
                    onChange={handleChange} placeholder="e.g. Livestock Keeper" />
                  <Input label="Department" name="department" value={form.department}
                    onChange={handleChange} placeholder="e.g. Dairy Section" />
                </>
              )}

              <Input label="Password" type="password" name="password" value={form.password}
                onChange={handleChange} placeholder="Min. 6 characters" required error={errors.password}
                autoComplete="new-password" />

              <Input label="Confirm password" type="password" name="confirmPassword"
                value={form.confirmPassword} onChange={handleChange} placeholder="Repeat your password"
                required error={errors.confirmPassword} autoComplete="new-password" />
            </div>

            <Button type="submit" size="lg" loading={loading} style={{ width: '100%', marginTop: '1.5rem' }}>
              Create account
            </Button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
