import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Alert, Badge } from '../components/dashboard/UI';
import { Leaf, Eye } from 'lucide-react';
import api from '../utils/api';
import './AuthPages.css';

// "Join a farm" — accounts are only created through a farm's invite link/code.
// New farm owners use /register-farm instead.
export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('invite') || '';

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', position: '', department: '', inviteCode: initialCode
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteState, setInviteState] = useState(initialCode ? 'checking' : 'empty'); // 'empty' | 'checking' | 'valid' | 'invalid'
  const [inviteData, setInviteData] = useState(null);
  const [inviteError, setInviteError] = useState('');

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: '' }));
    if (e.target.name === 'inviteCode') {
      setInviteState(e.target.value.trim() ? 'unchecked' : 'empty');
      setInviteData(null);
      setInviteError('');
    }
  };

  // Returns whether the code is valid (state updates are async, so callers use the return value).
  const checkInvite = useCallback(async (code) => {
    const trimmed = code.trim();
    if (!trimmed) { setInviteState('empty'); return false; }
    setInviteState('checking');
    try {
      const { data } = await api.get(`/invites/${encodeURIComponent(trimmed)}/validate`);
      setInviteData(data);
      setInviteState('valid');
      setInviteError('');
      if (data.email) setForm((p) => ({ ...p, email: data.email }));
      return true;
    } catch (err) {
      setInviteData(null);
      setInviteState('invalid');
      setInviteError(err.response?.data?.message || 'Invalid or expired invite');
      return false;
    }
  }, []);

  useEffect(() => {
    if (initialCode) checkInvite(initialCode);
  }, [initialCode, checkInvite]);

  const validate = (inviteValid) => {
    const errs = {};
    if (!form.inviteCode.trim()) errs.inviteCode = 'An invite code is required to join a farm';
    else if (!inviteValid) errs.inviteCode = 'This invite code is invalid or has expired';
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let inviteValid = inviteState === 'valid';
    if (!inviteValid && form.inviteCode.trim()) inviteValid = await checkInvite(form.inviteCode);
    const errs = validate(inviteValid);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setApiError('');
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      payload.inviteCode = payload.inviteCode.trim();
      await register(payload);
      navigate('/dashboard');
    } catch (err) {
      setApiError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isWorkerInvite = inviteState === 'valid' && inviteData?.role === 'worker';
  const roleLabel = !inviteData ? '' : inviteData.role === 'worker'
    ? 'a farm worker'
    : inviteData.viewOnly ? 'a view-only collaborator' : 'a farm manager';

  return (
    <div className="auth-page">
      <div
        className="auth-panel auth-panel-brand"
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/farm.jpg)` }}
      >
        <div className="auth-brand-content">
          <div className="auth-logo"><Leaf size={40} color="#fff" /></div>
          <h1 className="auth-brand-title">Join a farm</h1>
          <p className="auth-brand-tagline">Smart Farm Management System</p>
          <p className="auth-brand-desc">
            Use the invite link or code from your farm manager to create your account.
          </p>
        </div>
      </div>

      <div
        className="auth-panel auth-panel-form"
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/farm.jpg)` }}
      >
        <div className="auth-form-container">
          <div className="auth-form-header">
            {inviteState === 'valid' ? (
              <>
                <h2>You're invited!</h2>
                <p>Joining {inviteData?.farmName} as {roleLabel}</p>
              </>
            ) : (
              <>
                <h2>Join a farm</h2>
                <p>Enter the invite code your farm manager sent you</p>
              </>
            )}
          </div>

          {inviteState === 'valid' && (
            <Alert variant="success">
              You're joining <strong>{inviteData?.farmName}</strong>
              {inviteData?.invitedByName ? `, invited by ${inviteData.invitedByName}` : ''}.
              {inviteData?.viewOnly && <Badge variant="info"><Eye size={12} /> Read-only access</Badge>}
            </Alert>
          )}

          {apiError && <Alert variant="danger">{apiError}</Alert>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-fields">
              <Input label="Invite code" name="inviteCode" value={form.inviteCode} onChange={handleChange}
                onBlur={() => inviteState === 'unchecked' && checkInvite(form.inviteCode)}
                placeholder="e.g. 3f9a1c7b2e4d" required
                error={errors.inviteCode || (inviteState === 'invalid' ? inviteError : '')}
                hint={inviteState === 'checking' ? 'Checking invite…' : undefined} />

              <Input label="Full name" name="name" value={form.name} onChange={handleChange}
                placeholder="e.g. Kukunda Linda" required error={errors.name} autoComplete="name" />

              <Input label="Email address" type="email" name="email" value={form.email}
                onChange={handleChange} placeholder="you@example.com" required error={errors.email}
                autoComplete="email" disabled={inviteState === 'valid' && !!inviteData?.email} />

              <Input label="Phone number" name="phone" value={form.phone} onChange={handleChange}
                placeholder="+256 700 000 000" autoComplete="tel" />

              {isWorkerInvite && (
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
              Join farm
            </Button>
          </form>

          <p className="auth-switch">
            Starting your own farm? <Link to="/register-farm">Register your farm</Link>
            <br />
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
