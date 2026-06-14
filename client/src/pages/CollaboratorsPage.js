import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Card, CardHeader, Table, TableHead, Badge, Button, Modal, Input } from '../components/dashboard/UI';
import { Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const CollaboratorsPage = () => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/invites');
      setInvites(data);
    } catch (err) {
      toast.error('Failed to load invites');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      const { data } = await api.post('/invites', { email });
      toast.success('Invite created');
      setIsOpen(false); setEmail('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invite');
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke invite?')) return;
    try {
      await api.delete(`/invites/${id}`);
      toast.success('Invite revoked');
      load();
    } catch (err) {
      toast.error('Failed to revoke');
    }
  };

  const copyLink = (code) => {
    const url = `${window.location.origin}/register?invite=${code}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied'));
  };

  return (
    <div>
      <CardHeader title="Collaborators" subtitle="Invite view-only collaborators" />
      <Card>
        <div style={{ marginBottom: '1rem' }}>
          <p>Invite view-only collaborators such as farm owners who should only view data.</p>
          <Button onClick={() => setIsOpen(true)}>Invite Collaborator</Button>
        </div>

        <Table>
          <TableHead columns={[{ label: 'Restricted to' }, { label: 'Status' }, { label: 'Accepted by' }, { label: 'Expires' }, { label: 'Actions' }]} />
          <tbody>
            {invites.map(inv => {
              const isUsed = inv.used;
              const expired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
              return (
                <tr key={inv._id}>
                  <td>{inv.email || 'Anyone with the link'}</td>
                  <td>{isUsed ? <Badge variant="success">Accepted</Badge> : expired ? <Badge variant="warning">Expired</Badge> : <Badge>Pending</Badge>}</td>
                  <td>{inv.usedBy ? `${inv.usedBy.name} (${inv.usedBy.email})` : '—'}</td>
                  <td>{new Date(inv.expiresAt).toLocaleDateString()}</td>
                  <td>
                    {!isUsed && <Button onClick={() => copyLink(inv.code)}>Copy Link</Button>}
                    {!isUsed && <Button variant="default" onClick={() => handleRevoke(inv._id)}>Revoke</Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Invite Collaborator">
        <Input label="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <Button onClick={() => setIsOpen(false)} variant="default">Cancel</Button>
          <Button onClick={handleCreate}>Create</Button>
        </div>
      </Modal>
    </div>
  );
};

export default CollaboratorsPage;
