import React, { useEffect, useState, useCallback } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Button, Card, CardHeader, Badge, Modal, Input, Select,
  EmptyState, Spinner, Table, TableHead, Alert
} from '../components/dashboard/UI';

const EMPTY_FORM = {
  title: '', description: '', priority: 'Medium',
  assignedTo: '', dueDate: '', category: 'Other', notes: ''
};

const statusBadge = (s) => {
  const map = { Pending: 'warning', 'In Progress': 'info', Completed: 'success', Overdue: 'danger', Acknowledged: 'default' };
  return <Badge variant={map[s] || 'default'}>{s}</Badge>;
};

const priorityBadge = (p) => {
  const map = { High: 'danger', Medium: 'warning', Low: 'success' };
  return <Badge variant={map[p] || 'default'} size="sm">{p}</Badge>;
};

export default function TasksPage() {
  const { isManager, isViewOnly } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ status: '', priority: '' });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      const { data } = await api.get('/tasks', { params });
      setTasks(data);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (isManager) {
      api.get('/users/workers').then(({ data }) => setWorkers(data)).catch(() => {});
    }
  }, [isManager]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/tasks', form);
      toast.success('Task created and worker notified');
      setModalOpen(false);
      setForm(EMPTY_FORM);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally { setSaving(false); }
  };

  const updateStatus = async (taskId, status) => {
    try {
      await api.put(`/tasks/${taskId}`, { status });
      toast.success(`Task marked as ${status}`);
      fetchTasks();
    } catch { toast.error('Failed to update task status'); }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('Task deleted');
      fetchTasks();
    } catch { toast.error('Failed to delete task'); }
  };

  const NEXT_STATUSES = {
    Pending: ['Acknowledged', 'In Progress'],
    Acknowledged: ['In Progress'],
    'In Progress': ['Completed'],
    Overdue: ['Completed']
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Tasks</h1>
          <p>{isManager ? 'Assign and monitor farm tasks' : 'Your task assignments'}</p>
        </div>
        {isManager && !isViewOnly && (
          <Button icon={<Plus size={16} />} onClick={() => { setForm(EMPTY_FORM); setModalOpen(true); }}>
            Assign Task
          </Button>
        )}
      </div>

      <Card>
        <CardHeader title="All Tasks" subtitle={`${tasks.length} task${tasks.length !== 1 ? 's' : ''}`} />

        <div className="filter-bar">
          <select className="form-input" value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            aria-label="Filter by status">
            <option value="">All Statuses</option>
            {['Pending', 'Acknowledged', 'In Progress', 'Completed', 'Overdue'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="form-input" value={filters.priority}
            onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))}
            aria-label="Filter by priority">
            <option value="">All Priorities</option>
            {['High', 'Medium', 'Low'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {loading ? <Spinner /> : tasks.length === 0 ? (
          <EmptyState icon={<ClipboardList size={48} />} title="No tasks found"
            message={isManager ? 'Assign the first task to get started.' : 'No tasks assigned to you yet.'}
            action={isManager && !isViewOnly ? <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Assign Task</Button> : null} />
        ) : (
          <Table>
            <TableHead columns={[
              { label: 'Task' }, { label: 'Category' }, isManager ? { label: 'Assigned to' } : null,
              { label: 'Priority' }, { label: 'Due Date' }, { label: 'Status' },
              { label: 'Risk' },
              ...(isViewOnly ? [] : [{ label: 'Actions', width: 160 }])
            ].filter(Boolean)} />
            <tbody>
              {tasks.map((t) => (
                <tr key={t._id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{t.title}</div>
                    {t.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {t.description.slice(0, 60)}{t.description.length > 60 ? '…' : ''}
                      </div>
                    )}
                  </td>
                  <td><Badge variant="default" size="sm">{t.category}</Badge></td>
                  {isManager && <td>{t.assignedTo?.name || '—'}</td>}
                  <td>{priorityBadge(t.priority)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(t.dueDate).toLocaleDateString()}</td>
                  <td>{statusBadge(t.status)}</td>
                  <td>
                    {t.riskFlag ? (
                      <Badge variant={t.riskFlag === 'High' ? 'danger' : 'warning'} size="sm">
                        ⚠ {t.riskFlag} Risk
                      </Badge>
                    ) : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>}
                  </td>
                  {!isViewOnly && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {NEXT_STATUSES[t.status]?.map((s) => (
                          <Button key={s} variant="secondary" size="sm"
                            onClick={() => updateStatus(t._id, s)}>
                            {s === 'Completed' ? '✓ Done' : s}
                          </Button>
                        ))}
                        {isManager && (
                          <Button variant="ghost" size="sm" onClick={() => deleteTask(t._id)}
                            style={{ color: 'var(--color-danger)' }}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Create Task Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Assign New Task" size="lg">
        <form onSubmit={handleCreate}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input label="Task title" name="title" value={form.title} onChange={handleChange}
              placeholder="e.g. Morning feeding — Cattle paddock A" required />

            <div className="form-row">
              <Select label="Assign to" name="assignedTo" value={form.assignedTo}
                onChange={handleChange} required>
                <option value="">Select worker…</option>
                {workers.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} {w.trustScore ? `(Trust: ${w.trustScore.overallScore}%)` : ''}
                  </option>
                ))}
              </Select>
              <Select label="Priority" name="priority" value={form.priority} onChange={handleChange}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </Select>
            </div>

            <div className="form-row">
              <Select label="Category" name="category" value={form.category} onChange={handleChange}>
                {['Feeding', 'Medication', 'Cleaning', 'Inspection', 'Maintenance', 'Other'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
              <Input label="Due date" type="datetime-local" name="dueDate" value={form.dueDate}
                onChange={handleChange} required />
            </div>

            <div>
              <label className="form-label" htmlFor="task-desc">Description</label>
              <textarea id="task-desc" name="description" className="form-input" value={form.description}
                onChange={handleChange} placeholder="Describe what needs to be done…" rows={3} />
            </div>

            {form.priority === 'High' && (
              <Alert variant="warning">
                High-priority tasks will automatically receive a risk flag if the assigned worker's Trust Score is below 70%.
              </Alert>
            )}
          </div>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Assign Task</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
