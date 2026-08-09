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
  const [error, setError] = useState(null);

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
        setError(
          err.response?.status === 403 || err.response?.status === 401
            ? 'Your session doesn\'t have admin access. Try logging out and back in.'
            : err.response?.data?.message || 'Could not load admin stats. Please try again.'
        );
      }
    };
    load();
  }, []);

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        {error}
      </div>
    );
  }
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
              {Array.isArray(lStats.bySpecies) && lStats.bySpecies.map((item) => (
                <p key={item._id}>{item._id}: {item.count}</p>
              ))}
            </div>
          ) : <p>No livestock stats available</p>}
        </Card>

        <Card>
          <CardHeader title="Task Overview" subtitle="Pending/Completed/Overdue" />
          {tStats && Array.isArray(tStats) ? (
            <div>
              <p>Pending: {tStats.find((t) => t._id === 'Pending')?.count ?? 0}</p>
              <p>In Progress: {tStats.find((t) => t._id === 'In Progress')?.count ?? 0}</p>
              <p>Completed: {tStats.find((t) => t._id === 'Completed')?.count ?? 0}</p>
              <p>Overdue: {tStats.find((t) => t._id === 'Overdue')?.count ?? 0}</p>
            </div>
          ) : <p>No task stats available</p>}
        </Card>
      </div>

      <Card style={{ marginTop: '0.75rem' }}>
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