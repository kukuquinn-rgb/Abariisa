import React, { useState } from 'react';
import { Copy, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { Button, Input, Modal, Alert, Badge, Table, TableHead, EmptyState } from './UI';

export const inviteLink = (code) => `${window.location.origin}/register?invite=${code}`;

export const copyInviteLink = (code) =>
  navigator.clipboard.writeText(inviteLink(code))
    .then(() => toast.success('Invite link copied'))
    .catch(() => toast.error('Could not copy — select the link and copy it manually'));

/**
 * Create an invite to the manager's farm and show the link to share.
 * role: 'worker' | 'manager'; viewOnly applies to manager invites (collaborators).
 */
export const InviteModal = ({ isOpen, onClose, onCreated, role, viewOnly = false, title, description }) => {
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [invite, setInvite] = useState(null);

  const close = () => {
    setEmail('');
    setInvite(null);
    onClose();
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data } = await api.post('/invites', { email: email.trim() || undefined, role, viewOnly });
      setInvite(data);
      onCreated?.(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title={title}>
      {invite ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Alert variant="success">
            Invite created. Share this link{invite.email ? ` with ${invite.email}` : ''} — it expires on {new Date(invite.expiresAt).toLocaleDateString()}.
          </Alert>
          <Input label="Invite link" value={inviteLink(invite.code)} readOnly onFocus={(e) => e.target.select()} />
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Invite code: <strong>{invite.code}</strong> (they can also enter this on the "Join a farm" page)
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button variant="secondary" onClick={close}>Done</Button>
            <Button icon={<Copy size={16} />} onClick={() => copyInviteLink(invite.code)}>Copy link</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {description && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{description}</p>}
          <Input label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="person@example.com" hint="If set, only this email address can use the invite." />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button loading={creating} onClick={handleCreate}>Create invite link</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

const roleBadge = (inv) => {
  if (inv.role === 'worker') return <Badge>Worker</Badge>;
  return inv.viewOnly ? <Badge variant="info"><Eye size={12} /> View-only</Badge> : <Badge>Manager</Badge>;
};

/** Table of the farm's invites with copy / revoke actions. */
export const InviteTable = ({ invites, onRevoked, emptyMessage = 'No invites yet.' }) => {
  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke invite?')) return;
    try {
      await api.delete(`/invites/${id}`);
      toast.success('Invite revoked');
      onRevoked?.(id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke');
    }
  };

  if (invites.length === 0) return <EmptyState title="No invites" message={emptyMessage} />;

  return (
    <Table>
      <TableHead columns={[{ label: 'Restricted to' }, { label: 'Role' }, { label: 'Status' }, { label: 'Accepted by' }, { label: 'Expires' }, { label: 'Actions' }]} />
      <tbody>
        {invites.map((inv) => {
          const isUsed = inv.used;
          const expired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
          return (
            <tr key={inv._id}>
              <td>{inv.email || 'Anyone with the link'}</td>
              <td>{roleBadge(inv)}</td>
              <td>{isUsed ? <Badge variant="success">Accepted</Badge> : expired ? <Badge variant="warning">Expired</Badge> : <Badge>Pending</Badge>}</td>
              <td>{inv.usedBy ? `${inv.usedBy.name} (${inv.usedBy.email})` : '—'}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{new Date(inv.expiresAt).toLocaleDateString()}</td>
              <td>
                {!isUsed && (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {!expired && <Button size="sm" icon={<Copy size={14} />} onClick={() => copyInviteLink(inv.code)}>Copy link</Button>}
                    <Button size="sm" variant="secondary" onClick={() => handleRevoke(inv._id)}>Revoke</Button>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
};
