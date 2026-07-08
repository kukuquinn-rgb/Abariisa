import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp } from 'lucide-react';
import api from '../../utils/api';
import { Card, CardHeader, Badge, Button, Spinner, Alert } from './UI';

const INITIAL_THRESHOLDS = {
  blockHighPriorityBelow: 40,
  flagHighRisk: 50,
  flagMediumRisk: 70
};

export default function RiskDashboard() {
  const [riskSummary, setRiskSummary] = useState({ riskTasks: [], riskCounts: { High: 0, Medium: 0, Low: 0 } });
  const [thresholds, setThresholds] = useState(INITIAL_THRESHOLDS);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const [summaryRes, thresholdsRes] = await Promise.all([
        api.get('/tasks/risk-summary'),
        api.get('/tasks/thresholds')
      ]);
      setRiskSummary(summaryRes.data);
      setThresholds(thresholdsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  const handleThresholdChange = (field, value) => {
    setThresholds((current) => ({ ...current, [field]: Number(value) }));
  };

  const saveThresholds = async () => {
    setSaving(true);
    try {
      await api.put('/tasks/thresholds', thresholds);
      setEditing(false);
      await fetchRiskData();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const recalculateAll = async () => {
    setRecalculating(true);
    try {
      await api.post('/trust-scores/recalculate-all');
      await fetchRiskData();
    } catch (error) {
      console.error(error);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) return <Spinner size="md" label="Loading risk dashboard" />;

  return (
    <Card className="dashboard-card">
      <CardHeader
        title="Risk Dashboard"
        subtitle="Trust-based task flags and threshold controls"
        action={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={() => setEditing((current) => !current)}>
              {editing ? 'Close' : 'Thresholds'}
            </Button>
            <Button variant="primary" size="sm" loading={recalculating} onClick={recalculateAll}>
              Recalculate All
            </Button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ border: '1px solid var(--color-danger)', borderRadius: '0.75rem', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>High Risk</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-danger)' }}>{riskSummary.riskCounts.High}</div>
        </div>
        <div style={{ border: '1px solid var(--color-warning)', borderRadius: '0.75rem', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Medium Risk</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>{riskSummary.riskCounts.Medium}</div>
        </div>
        <div style={{ border: '1px solid var(--color-success)', borderRadius: '0.75rem', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Low Risk</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>{riskSummary.riskCounts.Low}</div>
        </div>
      </div>

      {editing && (
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ border: '1px solid var(--color-danger)', borderRadius: '0.75rem', padding: '0.75rem' }}>
            <label className="form-label">Block High-Priority Below (%)</label>
            <input className="form-input" type="number" min="0" max="100" value={thresholds.blockHighPriorityBelow} onChange={(e) => handleThresholdChange('blockHighPriorityBelow', e.target.value)} />
          </div>
          <div style={{ border: '1px solid var(--color-warning)', borderRadius: '0.75rem', padding: '0.75rem' }}>
            <label className="form-label">Flag as High Risk Below (%)</label>
            <input className="form-input" type="number" min="0" max="100" value={thresholds.flagHighRisk} onChange={(e) => handleThresholdChange('flagHighRisk', e.target.value)} />
          </div>
          <div style={{ border: '1px solid var(--color-success)', borderRadius: '0.75rem', padding: '0.75rem' }}>
            <label className="form-label">Flag as Medium Risk Below (%)</label>
            <input className="form-input" type="number" min="0" max="100" value={thresholds.flagMediumRisk} onChange={(e) => handleThresholdChange('flagMediumRisk', e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" loading={saving} onClick={saveThresholds}>Save Thresholds</Button>
          </div>
        </div>
      )}

      {riskSummary.riskTasks.length === 0 ? (
        <Alert variant="success">No at-risk tasks currently require attention.</Alert>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {riskSummary.riskTasks.map((task) => (
            <div key={task._id} style={{ border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{task.title}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    {task.assignedTo?.name || 'Unassigned'} • Due {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <Badge variant={task.riskFlag === 'High' ? 'danger' : 'warning'} size="sm">{task.riskFlag} Risk</Badge>
                  <Badge variant={task.status === 'Overdue' ? 'danger' : task.status === 'Completed' ? 'success' : 'info'} size="sm">{task.status}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
