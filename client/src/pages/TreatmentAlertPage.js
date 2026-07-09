import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Syringe } from 'lucide-react';
import api from '../utils/api';
import { Card, CardHeader, Spinner, Table, TableHead, Badge } from '../components/dashboard/UI';

const SECTION_ORDER = [
  { key: 'overdue', label: 'Overdue', variant: 'danger' },
  { key: 'dueWeek', label: 'Due This Week', variant: 'warning' },
  { key: 'comingSoon', label: 'Coming Soon', variant: 'success' }
];

export default function TreatmentAlertPage() {
  const [dueTreatments, setDueTreatments] = useState([]);
  const [pregnancies, setPregnancies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dueRes, pregnanciesRes] = await Promise.all([
          api.get('/livestock/due-treatments'),
          api.get('/livestock/pregnancies')
        ]);
        setDueTreatments(dueRes.data || []);
        setPregnancies(pregnanciesRes.data || []);
      } catch {
        setDueTreatments([]);
        setPregnancies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getDaysRemaining = (date) => {
    if (!date) return '—';
    const diff = Math.ceil((new Date(date) - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)} days overdue`;
    if (diff === 0) return 'Today';
    return `${diff} days`;
  };

  const classifyTreatment = (item) => {
    const diff = Math.ceil((new Date(item.dueDate) - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'overdue';
    if (diff <= 7) return 'dueWeek';
    return 'comingSoon';
  };

  const renderSection = (key, label, variant) => {
    const items = key === 'overdue'
      ? dueTreatments.filter((item) => classifyTreatment(item) === 'overdue')
      : key === 'dueWeek'
        ? dueTreatments.filter((item) => classifyTreatment(item) === 'dueWeek')
        : dueTreatments.filter((item) => classifyTreatment(item) === 'comingSoon');

    return (
      <Card key={key}>
        <CardHeader title={label} subtitle={`${items.length} item${items.length !== 1 ? 's' : ''}`} />
        {items.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No items in this group.</p>
        ) : (
          <Table>
            <TableHead columns={[{ label: 'Animal' }, { label: 'Type' }, { label: 'Due Date' }, { label: 'Days Remaining' }]} />
            <tbody>
              {items.map((item, idx) => (
                <tr key={`${key}-${idx}`}>
                  <td>{item.animalId}</td>
                  <td>{item.treatmentType}</td>
                  <td>{new Date(item.dueDate).toLocaleDateString()}</td>
                  <td>{getDaysRemaining(item.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Health Schedule</h1>
          <p>Upcoming treatments and pregnancies</p>
        </div>
      </div>

      {loading ? <Spinner size="lg" /> : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <Card>
            <CardHeader title="Active Pregnancies" subtitle="Expected births and countdowns" />
            {pregnancies.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No active pregnancies.</p>
            ) : (
              <Table>
                <TableHead columns={[{ label: 'Animal' }, { label: 'Expected Birth' }, { label: 'Days Remaining' }, { label: 'Status' }]} />
                <tbody>
                  {pregnancies.map((pregnancy) => (
                    <tr key={pregnancy.matingId}>
                      <td>{pregnancy.animalId}</td>
                      <td>{new Date(pregnancy.expectedBirthDate).toLocaleDateString()}</td>
                      <td>{getDaysRemaining(pregnancy.expectedBirthDate)}</td>
                      <td><Badge variant={pregnancy.daysUntilBirth < 0 ? 'danger' : pregnancy.daysUntilBirth <= 14 ? 'warning' : 'success'}>{pregnancy.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          {SECTION_ORDER.map((section) => renderSection(section.key, section.label, section.variant))}
        </div>
      )}
    </div>
  );
}
