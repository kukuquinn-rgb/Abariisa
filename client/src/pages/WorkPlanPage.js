import React, { useEffect, useMemo, useState } from 'react';
import { Plus, CalendarDays, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button, Card, CardHeader, Badge, Modal, Input, Select, Spinner } from '../components/dashboard/UI';

const EMPTY_ACTIVITY = { title: '', scheduledTime: '', isRepetitive: false, repeatFrequency: 'Daily' };

export default function WorkPlanPage() {
  const { isManager } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [form, setForm] = useState({ title: '', date: selectedDate, assignedTo: '', activities: [EMPTY_ACTIVITY] });
  const [activityNotes, setActivityNotes] = useState('');
  const [leakDescription, setLeakDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [activitySaving, setActivitySaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [plansRes, workersRes] = await Promise.all([
          api.get('/work-plans', { params: isManager ? { date: selectedDate } : {} }),
          api.get('/users?role=worker')
        ]);
        setPlans(plansRes.data || []);
        setWorkers(workersRes.data || []);
      } catch {
        toast.error('Failed to load work plans');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDate, isManager]);

  const createPlan = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/work-plans', { ...form, date: form.date || selectedDate });
      toast.success('Work plan created');
      setModalOpen(false);
      setForm({ title: '', date: selectedDate, assignedTo: '', activities: [EMPTY_ACTIVITY] });
      setSelectedDate(form.date || selectedDate);
    } catch {
      toast.error('Failed to create work plan');
    } finally {
      setSaving(false);
    }
  };

  const updateActivity = async (planId, activityId, status) => {
    setActivitySaving(true);
    try {
      await api.put(`/work-plans/${planId}/activities/${activityId}`, { status, workerNotes: activityNotes, leakPoint: false });
      toast.success('Activity updated');
      setActivityModalOpen(false);
      setActivityNotes('');
      setSelectedDate(selectedDate);
    } catch {
      toast.error('Failed to update activity');
    } finally {
      setActivitySaving(false);
    }
  };

  const reportLeakPoint = async (planId, activityId) => {
    setActivitySaving(true);
    try {
      await api.put(`/work-plans/${planId}/activities/${activityId}`, { leakPoint: true, leakPointDescription: leakDescription, workerNotes: activityNotes, status: 'Skipped' });
      toast.success('Leak point reported');
      setActivityModalOpen(false);
      setLeakDescription('');
      setActivityNotes('');
    } catch {
      toast.error('Failed to report leak point');
    } finally {
      setActivitySaving(false);
    }
  };

  const addActivity = () => setForm((p) => ({ ...p, activities: [...p.activities, { ...EMPTY_ACTIVITY }] }));
  const updateActivityField = (index, field, value) => setForm((p) => ({ ...p, activities: p.activities.map((a, i) => i === index ? { ...a, [field]: value } : a) }));

  const progressValue = (plan) => {
    const completed = plan.activities.filter((activity) => activity.status === 'Completed').length;
    return `${completed}/${plan.activities.length}`;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isManager ? 'Work Plan' : 'My Work Plan'}</h1>
          <p>{isManager ? 'Create and review work plans for the day' : 'Your daily activities and task updates'}</p>
        </div>
        {isManager && <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Create Work Plan</Button>}
      </div>

      {isManager && (
        <Card style={{ marginBottom: '1rem' }}>
          <CardHeader title="Select Date" subtitle="View plans for a specific day" />
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </Card>
      )}

      {loading ? <Spinner size="lg" /> : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {isManager ? (
            plans.map((plan) => (
              <Card key={plan._id}>
                <CardHeader title={plan.title} subtitle={`${plan.assignedTo?.name || 'Worker'} • ${new Date(plan.date).toLocaleDateString()}`} />
                <p style={{ marginBottom: '0.5rem' }}>Activities: {plan.activities.length} • Progress: {progressValue(plan)}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {plan.activities.map((activity, index) => (
                    <div key={`${plan._id}-${index}`} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}>
                      <strong>{activity.title}</strong>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{activity.scheduledTime || 'No time set'}</p>
                      <Badge variant={activity.status === 'Completed' ? 'success' : activity.status === 'Skipped' ? 'danger' : 'warning'}>{activity.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardHeader title="Today’s Work Plan" subtitle="Your assigned activities" />
                {plans.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>No work plan for today.</p> : (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {plans[0]?.activities.map((activity, index) => (
                      <div key={`${plans[0]._id}-${index}`} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                          <div>
                            <strong>{activity.title}</strong>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{activity.scheduledTime || 'No time set'}</p>
                          </div>
                          <Badge variant={activity.status === 'Completed' ? 'success' : activity.status === 'Skipped' ? 'danger' : 'warning'}>{activity.status}</Badge>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                          <Button variant="success" size="sm" onClick={() => { setSelectedPlanId(plans[0]._id); setSelectedActivity(activity._id); setActivityModalOpen(true); }}>Mark Complete</Button>
                          <Button variant="danger" size="sm" onClick={() => { setSelectedPlanId(plans[0]._id); setSelectedActivity(activity._id); setActivityModalOpen(true); }}>Report Leak Point</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              {plans[0] && (
                <Card>
                  <CardHeader title="Progress" subtitle="Daily update" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ flex: 1, height: 10, borderRadius: 999, background: 'var(--color-border)' }}>
                      <div style={{ width: `${(plans[0].activities.filter((activity) => activity.status === 'Completed').length / Math.max(plans[0].activities.length, 1)) * 100}%`, height: '100%', borderRadius: 999, background: 'var(--color-success)' }} />
                    </div>
                    <strong>{progressValue(plans[0])}</strong>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Work Plan" size="lg">
        <form onSubmit={createPlan} style={{ display: 'grid', gap: '0.75rem' }}>
          <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} required />
          <Select label="Assign To" value={form.assignedTo} onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))} required>
            <option value="">Select worker</option>
            {workers.map((worker) => <option key={worker._id} value={worker._id}>{worker.name}</option>)}
          </Select>
          <Card>
            <CardHeader title="Activities" subtitle="Add tasks for the day" />
            {form.activities.map((activity, index) => (
              <div key={index} style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Input label="Activity Title" value={activity.title} onChange={(e) => updateActivityField(index, 'title', e.target.value)} required />
                <Input label="Scheduled Time" value={activity.scheduledTime} onChange={(e) => updateActivityField(index, 'scheduledTime', e.target.value)} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={activity.isRepetitive} onChange={(e) => updateActivityField(index, 'isRepetitive', e.target.checked)} />
                  Repetitive
                </label>
                {activity.isRepetitive && (
                  <Select label="Repeat Frequency" value={activity.repeatFrequency} onChange={(e) => updateActivityField(index, 'repeatFrequency', e.target.value)}>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </Select>
                )}
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={addActivity}>Add Activity</Button>
          </Card>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Plan</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activityModalOpen} onClose={() => setActivityModalOpen(false)} title="Update Activity" size="md">
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <textarea className="form-input" rows={3} value={activityNotes} onChange={(e) => setActivityNotes(e.target.value)} placeholder="Worker notes" />
          <textarea className="form-input" rows={3} value={leakDescription} onChange={(e) => setLeakDescription(e.target.value)} placeholder="Leak point description (optional)" />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="success" onClick={() => updateActivity(selectedPlanId, selectedActivity, 'Completed')}>Mark Complete</Button>
            <Button variant="danger" onClick={() => reportLeakPoint(selectedPlanId, selectedActivity)}>Report Leak Point</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
