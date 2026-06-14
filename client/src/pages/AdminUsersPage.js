import React, { useEffect, useState, useMemo } from 'react';
import api from '../utils/api';
import { Card, CardHeader, Table, TableHead, Badge, Button, Spinner, Select, Input } from '../components/dashboard/UI';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const AdminUsersPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [rowLoading, setRowLoading] = useState({});

  const fetchUsers = async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await api.get('/users', { params });
      setUsers(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => {
      fetchUsers({ search, role: roleFilter, status: statusFilter });
    }, 300);
    setDebounceTimer(t);
    return () => clearTimeout(t);
  }, [search, roleFilter, statusFilter]);

  const handleRoleChange = async (id, newRole) => {
    if (!window.confirm('Change role?')) return;
    setRowLoading(s => ({ ...s, [id]: true }));
    try {
      const { data } = await api.put(`/users/${id}/role`, { role: newRole });
      toast.success('Role updated');
      setUsers(u => u.map(x => x._id === id ? data : x));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setRowLoading(s => ({ ...s, [id]: false }));
    }
  };

  const handleStatusToggle = async (id, isActive) => {
    if (!window.confirm('Change account status?')) return;
    setRowLoading(s => ({ ...s, [id]: true }));
    try {
      const { data } = await api.put(`/users/${id}/status`, { isActive: !isActive });
      toast.success('Status updated');
      setUsers(u => u.map(x => x._id === id ? data : x));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setRowLoading(s => ({ ...s, [id]: false }));
    }
  };

  return (
    <div>
      <CardHeader title="User Management" subtitle="Manage all platform users" />
      <Card>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <Input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="worker">Worker</option>
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        {loading ? <Spinner /> : (
          <Table>
            <TableHead columns={[{ label: 'Name' }, { label: 'Email' }, { label: 'Role' }, { label: 'Status' }, { label: 'Joined' }, { label: 'Actions' }]} />
            <tbody>
              {users.map(u => {
                const isSelf = u._id === user._id;
                return (
                  <tr key={u._id}>
                    <td>{u.name} {isSelf && <small>(you)</small>}</td>
                    <td>{u.email}</td>
                    <td><Badge variant={u.role === 'admin' ? 'danger' : u.role === 'manager' ? 'primary' : 'info'}>{u.role}</Badge></td>
                    <td>{u.isActive ? <Badge variant="success">Active</Badge> : <Badge>Inactive</Badge>}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Select value={u.role} onChange={(e) => handleRoleChange(u._id, e.target.value)} disabled={isSelf || rowLoading[u._id]}>
                        <option value="worker">Worker</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </Select>
                      <Button variant="default" onClick={() => handleStatusToggle(u._id, u.isActive)} disabled={isSelf || rowLoading[u._id]} loading={rowLoading[u._id]}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default AdminUsersPage;
