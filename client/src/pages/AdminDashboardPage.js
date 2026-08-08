import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { StatCard, Card, CardHeader, Spinner, Table, TableHead, Badge, Button } from '../components/dashboard/UI';
import { Users, Shield, UserCheck, UserX, UserCog } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [lStats, setLStats] = useState(null);
  const [tStats, setTStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: s }, { data: l }, { data: t }] = await Promise.all([
          api.get('/users/admin/stats'),
          api.get('/livestock/stats').catch(() => ({ data: null })),
          api.get('/tasks/stats').catch(() => ({ data: null }))
        ]);
        setStats(s);
        setLStats(l);
        setTStats(t);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  if (!stats) return <Spinner />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome, {user?.name}. Platform-wide overview and system management.</p>
        </div>
        <div>
          <Button onClick={() => window.location.href = '/admin/users'}>Manage Users</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginTop: '0.75rem' }}>
        <StatCard label="Total Users" value={stats.totalUsers} icon={<Users />} />
        <StatCard label="Farm Managers" value={stats.managers} icon={<Shield />} />
        <StatCard label="Workers" value={stats.workers} icon={<Users />} />
        <StatCard label="Administrators" value={stats.admins} icon={<UserCog />} />
        <StatCard label="Active Accounts" value={stats.activeUsers} icon={<UserCheck />} />
        <StatCard label="Inactive Accounts" value={stats.inactiveUsers} icon={<UserX />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
        <Card>
          <CardHeader title="Livestock Overview" subtitle="Totals by species" />
          {lStats ? (
            <div>
              <p>Total: {lStats.total}</p>
              {lStats.bySpecies && Object.entries(lStats.bySpecies).map(([k,v]) => (
                <p key={k}>{k}: {v}</p>
              ))}
            </div>
          ) : <p>No livestock stats available</p>}
        </Card>

        <Card>
          <CardHeader title="Task Overview" subtitle="Pending/Completed/Overdue" />
          {tStats ? (
            <div>
              <p>Pending: {tStats.pending}</p>
              <p>Completed: {tStats.completed}</p>
              <p>Overdue: {tStats.overdue}</p>
            </div>
          ) : <p>No task stats available</p>}
        </Card>
      </div>

      <Card style={{ marginTop: '1rem' }}>
        <CardHeader title="Recently Registered Users" />
        <Table>
          <TableHead columns={[{ label: 'Name' }, { label: 'Email' }, { label: 'Role' }, { label: 'Joined' }]} />
          <tbody>
            {stats.recentUsers.map(u => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><Badge variant={u.role === 'admin' ? 'danger' : u.role === 'manager' ? 'primary' : 'info'}>{u.role}</Badge></td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;
