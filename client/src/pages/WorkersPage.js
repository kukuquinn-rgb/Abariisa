import React, { useCallback, useEffect, useState } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button, Card, CardHeader, Badge, EmptyState, Spinner, Table, TableHead } from '../components/dashboard/UI';
import { InviteModal, InviteTable } from '../components/dashboard/Invites';

const trustBadge = (score) => {
  if (score === undefined || score === null) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
  const variant = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger';
  return <Badge variant={variant}>{score}%</Badge>;
};

export default function WorkersPage() {
  const { isViewOnly, farm } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const navigate = useNavigate();

  const loadInvites = useCallback(() => {
    if (isViewOnly) return;
    api.get('/invites', { params: { role: 'worker' } })
      .then(({ data }) => setInvites(data))
      .catch(() => toast.error('Failed to load worker invites'));
  }, [isViewOnly]);

  useEffect(() => { loadInvites(); }, [loadInvites]);

  useEffect(() => {
    api.get('/users/workers')
      .then(({ data }) => setWorkers(data))
      .catch(() => toast.error('Failed to load workers'))
      .finally(() => setLoading(false));
  }, []);

  const deactivate = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}'s account?`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Worker account deactivated');
      setWorkers((p) => p.filter((w) => w._id !== id));
    } catch { toast.error('Failed to deactivate'); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Workers</h1>
          <p>Manage farm worker profiles and monitor trust scores</p>
        </div>
        {!isViewOnly && <Button icon={<UserPlus size={16} />} onClick={() => setInviteOpen(true)}>
          Invite Worker
        </Button>}
      </div>

      <Card>
        <CardHeader title="All Workers" subtitle={`${workers.length} active worker${workers.length !== 1 ? 's' : ''}`} />
        {loading ? <Spinner /> : workers.length === 0 ? (
          <EmptyState icon={<Users size={48} />} title="No workers registered"
            message="Invite workers with a link so they can check in and receive tasks." />
        ) : (
          <Table>
            <TableHead columns={[
              { label: 'Worker' }, { label: 'Position' }, { label: 'Department' },
              { label: 'Phone' }, { label: 'Trust Score' }, { label: 'Joined' },
              ...(isViewOnly ? [] : [{ label: 'Actions', width: 140 }])
            ]} />
            <tbody>
              {workers.map((w) => {
                const initials = w.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr key={w._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.875rem', flexShrink: 0
                        }} aria-hidden="true">{initials}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{w.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{w.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{w.position || '—'}</td>
                    <td>{w.department || '—'}</td>
                    <td>{w.phone || '—'}</td>
                    <td>{trustBadge(w.trustScore?.overallScore)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(w.createdAt).toLocaleDateString()}</td>
                    {!isViewOnly && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/workers/${w._id}`)}>
                            Profile
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deactivate(w._id, w.name)}
                            style={{ color: 'var(--color-danger)' }}>
                            Deactivate
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {!isViewOnly && invites.length > 0 && (
        <Card style={{ marginTop: '1.5rem' }}>
          <CardHeader title="Worker Invites" subtitle="Share a link so a worker can create their account on your farm" />
          <InviteTable invites={invites} onRevoked={loadInvites} />
        </Card>
      )}

      <InviteModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={loadInvites}
        role="worker"
        title="Invite Worker"
        description={`Create a link a worker can use to join ${farm?.name || 'your farm'}. They'll set their own password.`}
      />
    </div>
  );
}
