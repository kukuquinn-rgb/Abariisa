import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Alert } from '../components/dashboard/UI';
import { Leaf, Home, Ticket } from 'lucide-react';
import './AuthPages.css';

// Shown to signed-in users who aren't linked to a farm yet (new Google accounts):
// they either create their own farm or join one with an invite code.
export default function OnboardingPage() {
  const { user, onboard, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('invite') || '';

  const [mode, setMode] = useState(initialCode ? 'invite' : 'create'); // 'create' | 'invite'
  const [farmForm, setFarmForm] = useState({ farmName: '', district: '', village: '', phone: '' });
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFarmChange = (e) => {
    setFarmForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFieldError('');
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setFieldError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'create' && !farmForm.farmName.trim()) { setFieldError('Farm name is required'); return; }
    if (mode === 'invite' && !inviteCode.trim()) { setFieldError('Enter the invite code from your farm manager'); return; }

    setLoading(true);
    try {
      await onboard(mode === 'create' ? farmForm : { inviteCode: inviteCode.trim() });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="auth-page">
      <div
        className="auth-panel auth-panel-brand"
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/farm.jpg)` }}
      >
        <div className="auth-brand-content">
          <div className="auth-logo"><Leaf size={40} color="#fff" /></div>
          <h1 className="auth-brand-title">Welcome to Abariisa</h1>
          <p className="auth-brand-tagline">Smart Farm Management System</p>
          <p className="auth-brand-desc">
            One more step: set up your own farm, or join the farm that invited you.
          </p>
        </div>
      </div>

      <div
        className="auth-panel auth-panel-form"
        style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/farm.jpg)` }}
      >
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Hi {user?.name?.split(' ')[0] || 'there'}!</h2>
            <p>Signed in as {user?.email}. Your account isn't linked to a farm yet.</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }} role="tablist" aria-label="How do you want to start?">
            <Button
              type="button" role="tab" aria-selected={mode === 'create'}
              variant={mode === 'create' ? 'primary' : 'secondary'}
              icon={<Home size={16} />} style={{ flex: 1 }}
              onClick={() => switchMode('create')}
            >
              Create a farm
            </Button>
            <Button
              type="button" role="tab" aria-selected={mode === 'invite'}
              variant={mode === 'invite' ? 'primary' : 'secondary'}
              icon={<Ticket size={16} />} style={{ flex: 1 }}
              onClick={() => switchMode('invite')}
            >
              Enter invite code
            </Button>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <form onSubmit={handleSubmit} noValidate>
            {mode === 'create' ? (
              <div className="auth-fields">
                <Input label="Farm name" name="farmName" value={farmForm.farmName} onChange={handleFarmChange}
                  placeholder="e.g. Kato's Farm" required error={fieldError} />
                <Input label="District" name="district" value={farmForm.district} onChange={handleFarmChange}
                  placeholder="e.g. Mbarara" />
                <Input label="Village" name="village" value={farmForm.village} onChange={handleFarmChange}
                  placeholder="e.g. Rwanyamahembe" />
                <Input label="Phone number" name="phone" value={farmForm.phone} onChange={handleFarmChange}
                  placeholder="+256 700 000 000" autoComplete="tel" />
              </div>
            ) : (
              <div className="auth-fields">
                <Input label="Invite code" name="inviteCode" value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value); setFieldError(''); }}
                  placeholder="e.g. 3f9a1c7b2e4d" required error={fieldError}
                  hint="Ask your farm manager for an invite link or code." />
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} style={{ width: '100%', marginTop: '1.5rem' }}>
              {mode === 'create' ? 'Create farm' : 'Join farm'}
            </Button>
          </form>

          <p className="auth-switch">
            Wrong account?{' '}
            <button type="button" onClick={handleLogout}
              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', font: 'inherit' }}>
              Sign out
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
