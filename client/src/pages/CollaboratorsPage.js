import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Card, CardHeader, Button, Spinner } from '../components/dashboard/UI';
import { InviteModal, InviteTable } from '../components/dashboard/Invites';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CollaboratorsPage = () => {
  const { farm } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/invites', { params: { role: 'manager' } });
      setInvites(data);
    } catch (err) {
      toast.error('Failed to load invites');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <CardHeader title="Collaborators" subtitle={`Invite view-only collaborators to ${farm?.name || 'your farm'}`} />
      <Card>
        <div style={{ marginBottom: '1rem' }}>
          <p>Invite view-only collaborators such as farm owners who should only view data.</p>
          <Button onClick={() => setIsOpen(true)}>Invite Collaborator</Button>
        </div>

        {loading ? <Spinner /> : (
          <InviteTable invites={invites} onRevoked={load} emptyMessage="No collaborator invites yet." />
        )}
      </Card>

      <InviteModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onCreated={load}
        role="manager"
        viewOnly
        title="Invite Collaborator"
        description={`Collaborators can view ${farm?.name || 'your farm'}'s data but can't make changes.`}
      />
    </div>
  );
};

export default CollaboratorsPage;
