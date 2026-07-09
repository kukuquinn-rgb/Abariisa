import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, X, Plus, CalendarDays, Syringe, HeartPulse, ClipboardList, Beef } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Button, Card, CardHeader, Badge, Modal, Input, Select, Spinner, Table, TableHead } from '../components/dashboard/UI';
import '../components/dashboard/UI.css';

const TABS = ['Overview', 'Treatments & Schedule', 'Pregnancy & Production', 'Daily Check History'];

export default function LivestockDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [dailyCheckForm, setDailyCheckForm] = useState({ fed: false, watered: false, returnedToKraal: false, isMissing: false, notes: '' });
  const [savingDailyCheck, setSavingDailyCheck] = useState(false);
  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [matingModalOpen, setMatingModalOpen] = useState(false);
  const [treatmentForm, setTreatmentForm] = useState({ type: 'Deworming', drugName: '', dose: '', dateAdministered: '', nextDueDate: '', administeredBy: '', notes: '' });
  const [matingForm, setMatingForm] = useState({ matingDate: '', maleAnimalId: '', notes: '' });
  const [savingTreatment, setSavingTreatment] = useState(false);
  const [savingMating, setSavingMating] = useState(false);

  const fetchAnimal = async () => {
    try {
      const { data } = await api.get(`/livestock/${id}`);
      setAnimal(data);
    } catch {
      toast.error('Unable to load animal details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnimal(); }, [id]);

  const handleDailyCheckSubmit = async (e) => {
    e.preventDefault();
    setSavingDailyCheck(true);
    try {
      const { data } = await api.post(`/livestock/${id}/daily-check`, dailyCheckForm);
      setAnimal(data);
      setDailyCheckForm({ fed: false, watered: false, returnedToKraal: false, isMissing: false, notes: '' });
      toast.success('Daily check recorded');
    } catch {
      toast.error('Failed to save daily check');
    } finally {
      setSavingDailyCheck(false);
    }
  };

  const handleTreatmentSubmit = async (e) => {
    e.preventDefault();
    setSavingTreatment(true);
    try {
      const { data } = await api.post(`/livestock/${id}/treatments`, treatmentForm);
      setAnimal(data);
      setTreatmentModalOpen(false);
      setTreatmentForm({ type: 'Deworming', drugName: '', dose: '', dateAdministered: '', nextDueDate: '', administeredBy: '', notes: '' });
      toast.success('Treatment recorded');
    } catch {
      toast.error('Failed to record treatment');
    } finally {
      setSavingTreatment(false);
    }
  };

  const handleMatingSubmit = async (e) => {
    e.preventDefault();
    setSavingMating(true);
    try {
      const { data } = await api.post(`/livestock/${id}/matings`, matingForm);
      setAnimal(data);
      setMatingModalOpen(false);
      setMatingForm({ matingDate: '', maleAnimalId: '', notes: '' });
      toast.success('Mating recorded');
    } catch {
      toast.error('Failed to record mating');
    } finally {
      setSavingMating(false);
    }
  };

  const getAgeInYears = () => {
    if (!animal?.dateOfBirth) return '—';
    const ageInMs = Date.now() - new Date(animal.dateOfBirth).getTime();
    return (ageInMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
  };

  const lastDailyCheck = animal?.dailyChecks?.[animal.dailyChecks.length - 1];
  const treatmentRows = animal?.treatments || [];
  const matingRows = animal?.matings || [];
  const recentChecks = (animal?.dailyChecks || []).slice(-14).reverse();

  if (loading) return <Spinner size="lg" />;
  if (!animal) return <Card><CardHeader title="Animal not found" /><p style={{ color: 'var(--color-text-muted)' }}>The requested animal record could not be found.</p></Card>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{animal.animalId}</h1>
          <p>{animal.species} • {animal.animalType || 'Other'} • {animal.location || 'No location recorded'}</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/livestock')}>Back to Livestock</Button>
      </div>

      <Card className="worker-attendance-card" padding={false}>
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{animal.animalId}</h2>
            <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{animal.species} • {animal.animalType || 'Other'}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Badge variant={animal.healthStatus === 'Healthy' ? 'success' : animal.healthStatus === 'Sick' ? 'danger' : 'warning'}>{animal.healthStatus}</Badge>
            <Badge variant="default">{animal.location || 'No location'}</Badge>
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0', flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <Button key={tab} variant={activeTab === tab ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab(tab)}>{tab}</Button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <Card>
            <CardHeader title="Animal Details" subtitle="Core information" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div><strong>Breed:</strong> {animal.breed || '—'}</div>
              <div><strong>Gender:</strong> {animal.gender}</div>
              <div><strong>Weight:</strong> {animal.weight ? `${animal.weight} kg` : '—'}</div>
              <div><strong>DOB:</strong> {animal.dateOfBirth ? new Date(animal.dateOfBirth).toLocaleDateString() : '—'}</div>
              <div><strong>Age:</strong> {getAgeInYears()} years</div>
              <div><strong>Location:</strong> {animal.location || '—'}</div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Latest Daily Check" subtitle="Most recent health observation" />
            {lastDailyCheck ? (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <p><strong>Date:</strong> {new Date(lastDailyCheck.date).toLocaleDateString()}</p>
                <p><strong>Fed:</strong> {lastDailyCheck.fed ? <Check size={16} color="green" /> : <X size={16} color="red" />}</p>
                <p><strong>Watered:</strong> {lastDailyCheck.watered ? <Check size={16} color="green" /> : <X size={16} color="red" />}</p>
                <p><strong>Returned to Kraal:</strong> {lastDailyCheck.returnedToKraal ? <Check size={16} color="green" /> : <X size={16} color="red" />}</p>
                <p><strong>Missing:</strong> {lastDailyCheck.isMissing ? <span style={{ color: 'var(--color-danger)' }}>Yes</span> : 'No'}</p>
                {lastDailyCheck.notes && <p><strong>Notes:</strong> {lastDailyCheck.notes}</p>}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)' }}>No daily checks recorded yet.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Quick Daily Check" subtitle="Record today's observation" />
            <form onSubmit={handleDailyCheckSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={dailyCheckForm.fed} onChange={(e) => setDailyCheckForm((p) => ({ ...p, fed: e.target.checked }))} />
                Fed
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={dailyCheckForm.watered} onChange={(e) => setDailyCheckForm((p) => ({ ...p, watered: e.target.checked }))} />
                Watered
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={dailyCheckForm.returnedToKraal} onChange={(e) => setDailyCheckForm((p) => ({ ...p, returnedToKraal: e.target.checked }))} />
                Returned to Kraal
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={dailyCheckForm.isMissing} onChange={(e) => setDailyCheckForm((p) => ({ ...p, isMissing: e.target.checked }))} />
                Missing
              </label>
              <textarea className="form-input" rows={3} value={dailyCheckForm.notes} onChange={(e) => setDailyCheckForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" />
              <Button type="submit" loading={savingDailyCheck}>Save Daily Check</Button>
            </form>
          </Card>
        </div>
      )}

      {activeTab === 'Treatments & Schedule' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <Card>
            <CardHeader title="Treatment History" subtitle="Past and upcoming treatments" action={<Button icon={<Plus size={16} />} onClick={() => setTreatmentModalOpen(true)}>Add Treatment</Button>} />
            {treatmentRows.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No treatments recorded.</p>
            ) : (
              <Table>
                <TableHead columns={[{ label: 'Type' }, { label: 'Drug' }, { label: 'Dose' }, { label: 'Date Given' }, { label: 'Next Due' }, { label: 'Given By' }]} />
                <tbody>
                  {treatmentRows.map((treatment, idx) => {
                    const dueDate = treatment.nextDueDate ? new Date(treatment.nextDueDate) : null;
                    const isOverdue = dueDate && dueDate < new Date();
                    const isSoon = dueDate && !isOverdue && dueDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                    return (
                      <tr key={idx} style={{ background: isOverdue ? 'rgba(248, 113, 113, 0.12)' : isSoon ? 'rgba(250, 204, 21, 0.16)' : 'transparent' }}>
                        <td>{treatment.type}</td>
                        <td>{treatment.drugName || '—'}</td>
                        <td>{treatment.dose || '—'}</td>
                        <td>{treatment.dateAdministered ? new Date(treatment.dateAdministered).toLocaleDateString() : '—'}</td>
                        <td>{dueDate ? dueDate.toLocaleDateString() : '—'}</td>
                        <td>{treatment.administeredBy || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>

          <Modal isOpen={treatmentModalOpen} onClose={() => setTreatmentModalOpen(false)} title="Add Treatment" size="md">
            <form onSubmit={handleTreatmentSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
              <Select label="Treatment Type" name="type" value={treatmentForm.type} onChange={(e) => setTreatmentForm((p) => ({ ...p, type: e.target.value }))}>
                {['Deworming', 'Spraying', 'Dehorning', 'Salt Lick', 'Vaccination', 'Drug Administration', 'Other'].map((value) => <option key={value} value={value}>{value}</option>)}
              </Select>
              <Input label="Drug Name" name="drugName" value={treatmentForm.drugName} onChange={(e) => setTreatmentForm((p) => ({ ...p, drugName: e.target.value }))} />
              <Input label="Dose" name="dose" value={treatmentForm.dose} onChange={(e) => setTreatmentForm((p) => ({ ...p, dose: e.target.value }))} />
              <Input label="Date Administered" name="dateAdministered" type="date" value={treatmentForm.dateAdministered} onChange={(e) => setTreatmentForm((p) => ({ ...p, dateAdministered: e.target.value }))} />
              <Input label="Next Due Date" name="nextDueDate" type="date" value={treatmentForm.nextDueDate} onChange={(e) => setTreatmentForm((p) => ({ ...p, nextDueDate: e.target.value }))} />
              <Input label="Administered By" name="administeredBy" value={treatmentForm.administeredBy} onChange={(e) => setTreatmentForm((p) => ({ ...p, administeredBy: e.target.value }))} />
              <textarea className="form-input" rows={3} value={treatmentForm.notes} onChange={(e) => setTreatmentForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" />
              <div className="form-actions">
                <Button type="button" variant="secondary" onClick={() => setTreatmentModalOpen(false)}>Cancel</Button>
                <Button type="submit" loading={savingTreatment}>Save Treatment</Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {activeTab === 'Pregnancy & Production' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {animal.gender !== 'Female' ? (
            <Card><CardHeader title="Pregnancy & Production" subtitle="This section is available for female animals" /><p style={{ color: 'var(--color-text-muted)' }}>No pregnancy data available for this animal.</p></Card>
          ) : (
            <Card>
              <CardHeader title="Mating Records" subtitle="Breeding and pregnancy tracking" action={<Button icon={<Plus size={16} />} onClick={() => setMatingModalOpen(true)}>Record Mating</Button>} />
              {matingRows.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>No mating records yet.</p>
              ) : (
                <Table>
                  <TableHead columns={[{ label: 'Mating Date' }, { label: 'Male Animal ID' }, { label: 'Expected Birth' }, { label: 'Days Until Birth' }, { label: 'Status' }]} />
                  <tbody>
                    {matingRows.map((mating, idx) => {
                      const expectedBirth = mating.expectedBirthDate ? new Date(mating.expectedBirthDate) : null;
                      const daysUntilBirth = expectedBirth ? Math.ceil((expectedBirth - Date.now()) / (1000 * 60 * 60 * 24)) : '—';
                      return (
                        <tr key={idx}>
                          <td>{mating.matingDate ? new Date(mating.matingDate).toLocaleDateString() : '—'}</td>
                          <td>{mating.maleAnimalId || '—'}</td>
                          <td>{expectedBirth ? expectedBirth.toLocaleDateString() : '—'}</td>
                          <td>{daysUntilBirth === '—' ? '—' : daysUntilBirth}</td>
                          <td>{mating.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </Card>
          )}

          <Modal isOpen={matingModalOpen} onClose={() => setMatingModalOpen(false)} title="Record Mating" size="md">
            <form onSubmit={handleMatingSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
              <Input label="Mating Date" name="matingDate" type="date" value={matingForm.matingDate} onChange={(e) => setMatingForm((p) => ({ ...p, matingDate: e.target.value }))} required />
              <Input label="Male Animal ID" name="maleAnimalId" value={matingForm.maleAnimalId} onChange={(e) => setMatingForm((p) => ({ ...p, maleAnimalId: e.target.value }))} />
              <textarea className="form-input" rows={3} value={matingForm.notes} onChange={(e) => setMatingForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" />
              <div className="form-actions">
                <Button type="button" variant="secondary" onClick={() => setMatingModalOpen(false)}>Cancel</Button>
                <Button type="submit" loading={savingMating}>Save Mating</Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {activeTab === 'Daily Check History' && (
        <Card>
          <CardHeader title="Daily Check History" subtitle="Last 14 observations" />
          {recentChecks.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No daily checks recorded.</p>
          ) : (
            <Table>
              <TableHead columns={[{ label: 'Date' }, { label: 'Checked By' }, { label: 'Fed' }, { label: 'Watered' }, { label: 'Kraal' }, { label: 'Missing' }, { label: 'Notes' }]} />
              <tbody>
                {recentChecks.map((check, idx) => (
                  <tr key={idx}>
                    <td>{new Date(check.date).toLocaleDateString()}</td>
                    <td>{check.checkedBy ? 'Staff' : '—'}</td>
                    <td>{check.fed ? <Check size={16} color="green" /> : <X size={16} color="red" />}</td>
                    <td>{check.watered ? <Check size={16} color="green" /> : <X size={16} color="red" />}</td>
                    <td>{check.returnedToKraal ? <Check size={16} color="green" /> : <X size={16} color="red" />}</td>
                    <td>{check.isMissing ? <span style={{ color: 'var(--color-danger)' }}>Yes</span> : 'No'}</td>
                    <td>{check.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
