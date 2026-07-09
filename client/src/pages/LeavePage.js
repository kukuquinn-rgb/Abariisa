import React, { useEffect, useState } from 'react';
import { Plus, CalendarOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button, Card, CardHeader, Badge, Modal, Input, Select, Spinner, Table, TableHead } from '../components/dashboard/UI';

const LEAVE_TYPES = ['Annual', 'Sick', 'Emergency', 'Unpaid', 'Other'];

export default function LeavePage() {
  const { isManager } = useAuth();
  const [leaveData, setLeaveData] = useState({ leaves: [], totalAnnualDays: 21, usedDays: 0, remainingDays: 21 });
  const [allLeaves, setAllLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ leaveType: 'Annual', startDate: '', endDate: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isManager) {
        const { data } = await api.get('/leave');
        setAllLeaves(data || []);
      } else {
        const { data } = await api.get('/leave/my');
        setLeaveData(data || { leaves: [], totalAnnualDays: 21, usedDays: 0, remainingDays: 21 });
      }
    } catch {
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [isManager]);

  const submitLeave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/leave', form);
      toast.success('Leave request submitted');
      setModalOpen(false);
      setForm({ leaveType: 'Annual', startDate: '', endDate: '', reason: '' });
      fetchData();
    } catch {
      toast.error('Failed to submit leave request');
    } finally {
      setSaving(false);
    }
  };

  const respondToLeave = async (leaveId, status) => {
    try {
      await api.put(`/leave/${leaveId}`, { status, managerNotes: '' });
      toast.success(`Leave ${status.toLowerCase()}`);
      fetchData();
    } catch {
      toast.error('Failed to update leave request');
    }
  };

  const badgeVariant = (status) => {
    if (status === 'Approved') return 'success';
    if (status === 'Rejected') return 'danger';
    return 'warning';
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isManager ? 'Leave Management' : 'My Leave'}</h1>
          <p>{isManager ? 'Review and approve leave requests' : 'Track your leave requests and remaining annual leave'}</p>
        </div>
        {!isManager && <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Request Leave</Button>}
      </div>

      {!isManager && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <Card>
            <p className="stat-card-label">Annual Leave Remaining</p>
            <p className="stat-card-value">{leaveData.remainingDays} days</p>
          </Card>
        </div>
      )}

      {isManager ? (
        <Card>
          <CardHeader title="Leave Requests" subtitle="Pending and previous requests" />
          <Table>
            <TableHead columns={[{ label: 'Worker' }, { label: 'Type' }, { label: 'Dates' }, { label: 'Days' }, { label: 'Status' }, { label: 'Actions' }]} />
            <tbody>
              {allLeaves.map((leave) => (
                <tr key={leave._id}>
                  <td>{leave.worker?.name || '—'}</td>
                  <td>{leave.leaveType}</td>
                  <td>{new Date(leave.startDate).toLocaleDateString()} → {new Date(leave.endDate).toLocaleDateString()}</td>
                  <td>{leave.days}</td>
                  <td><Badge variant={badgeVariant(leave.status)}>{leave.status}</Badge></td>
                  <td>
                    {leave.status === 'Pending' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button variant="success" size="sm" onClick={() => respondToLeave(leave._id, 'Approved')}>Approve</Button>
                        <Button variant="danger" size="sm" onClick={() => respondToLeave(leave._id, 'Rejected')}>Reject</Button>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Your Leave Requests" subtitle="Current leave activity" />
          <Table>
            <TableHead columns={[{ label: 'Type' }, { label: 'Start' }, { label: 'End' }, { label: 'Days' }, { label: 'Status' }, { label: 'Notes' }]} />
            <tbody>
              {leaveData.leaves.map((leave) => (
                <tr key={leave._id}>
                  <td>{leave.leaveType}</td>
                  <td>{new Date(leave.startDate).toLocaleDateString()}</td>
                  <td>{new Date(leave.endDate).toLocaleDateString()}</td>
                  <td>{leave.days}</td>
                  <td><Badge variant={badgeVariant(leave.status)}>{leave.status}</Badge></td>
                  <td>{leave.managerNotes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Request Leave" size="md">
        <form onSubmit={submitLeave} style={{ display: 'grid', gap: '0.75rem' }}>
          <Select label="Leave Type" value={form.leaveType} onChange={(e) => setForm((p) => ({ ...p, leaveType: e.target.value }))}>
            {LEAVE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
          <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} required />
          <Input label="End Date" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} required />
          <textarea className="form-input" rows={3} placeholder="Reason" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Submit Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
