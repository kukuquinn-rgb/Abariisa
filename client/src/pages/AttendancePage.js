import React, { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Button, Card, CardHeader, Badge, EmptyState, Spinner,
  Table, TableHead, Alert, StatCard
} from '../components/dashboard/UI';

const statusBadge = (s) => {
  const map = { Present: 'success', Late: 'warning', Absent: 'danger', 'Half Day': 'info' };
  return <Badge variant={map[s] || 'default'}>{s}</Badge>;
};

export default function AttendancePage() {
  const { isWorker, isManager } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const { data } = await api.get('/attendance', { params });
      setRecords(data);

      // Check today's record for workers
      if (isWorker) {
        const today = new Date().toISOString().split('T')[0];
        const todayRec = data.find((r) => r.date?.startsWith(today));
        setTodayRecord(todayRec || null);
      }
    } catch { toast.error('Failed to load attendance records'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRecords(); }, [filters]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await api.post('/attendance/checkin');
      toast.success('Checked in successfully! ✅');
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await api.put('/attendance/checkout');
      toast.success('Checked out successfully! 👋');
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally { setActionLoading(false); }
  };

  const presentCount = records.filter((r) => r.status === 'Present').length;
  const lateCount = records.filter((r) => r.status === 'Late').length;
  const absentCount = records.filter((r) => r.status === 'Absent').length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Attendance</h1>
          <p>{isWorker ? 'Record your daily attendance' : 'Monitor worker attendance'}</p>
        </div>
      </div>

      {/* Worker Check-in / Check-out panel */}
      {isWorker && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <CardHeader title="Today's Attendance" subtitle={new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
          {todayRecord ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Check-in</p>
                  <p style={{ fontWeight: 600 }}>
                    {todayRecord.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString() : '—'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Check-out</p>
                  <p style={{ fontWeight: 600 }}>
                    {todayRecord.checkOut ? new Date(todayRecord.checkOut).toLocaleTimeString() : '—'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Status</p>
                  {statusBadge(todayRecord.status)}
                </div>
              </div>
              {!todayRecord.checkOut && (
                <div>
                  <Button variant="secondary" onClick={handleCheckOut} loading={actionLoading}>
                    Check Out
                  </Button>
                </div>
              )}
              {todayRecord.checkOut && (
                <Alert variant="success">You have completed your attendance record for today.</Alert>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Alert variant="info">You haven't checked in yet today. Remember to check in when you start work.</Alert>
              <div>
                <Button onClick={handleCheckIn} loading={actionLoading}>
                  Check In Now
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard label="Present" value={presentCount} icon={<CalendarCheck size={22} />} variant="success" />
        <StatCard label="Late" value={lateCount} icon={<CalendarCheck size={22} />} variant="warning" />
        <StatCard label="Absent" value={absentCount} icon={<CalendarCheck size={22} />} variant="danger" />
      </div>

      {/* Records table */}
      <Card>
        <CardHeader title="Attendance Records" subtitle="Daily attendance log" />

        <div className="filter-bar">
          <div className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="start-date" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>From</label>
            <input id="start-date" type="date" className="form-input" value={filters.startDate}
              onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))} />
          </div>
          <div className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="end-date" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>To</label>
            <input id="end-date" type="date" className="form-input" value={filters.endDate}
              onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))} />
          </div>
          {(filters.startDate || filters.endDate) && (
            <Button variant="ghost" size="sm"
              onClick={() => setFilters({ startDate: '', endDate: '' })}>
              Clear
            </Button>
          )}
        </div>

        {loading ? <Spinner /> : records.length === 0 ? (
          <EmptyState icon={<CalendarCheck size={48} />} title="No attendance records"
            message="Attendance records will appear here once workers check in." />
        ) : (
          <Table>
            <TableHead columns={[
              { label: 'Date' },
              isManager ? { label: 'Worker' } : null,
              { label: 'Check-in' }, { label: 'Check-out' },
              { label: 'Status' }, { label: 'Notes' }
            ].filter(Boolean)} />
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.date).toLocaleDateString()}</td>
                  {isManager && <td>{r.worker?.name || '—'}</td>}
                  <td>{r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '—'}</td>
                  <td>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '—'}</td>
                  <td>{statusBadge(r.status)}</td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
