import React, { useEffect, useState } from 'react';
import { Plus, Search, Beef } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Button, Card, CardHeader, Badge, Modal, Input,
  Select, EmptyState, Spinner, Table, TableHead, StatCard
} from '../components/dashboard/UI';
import '../components/dashboard/UI.css';

const SPECIES = ['Cattle', 'Goat', 'Sheep', 'Pig', 'Poultry', 'Other'];
const HEALTH_STATUSES = ['Healthy', 'Sick', 'Under Treatment', 'Quarantined', 'Deceased'];

const EMPTY_FORM = {
  animalId: '', species: 'Cattle', breed: '', gender: 'Unknown',
  healthStatus: 'Healthy', feedingSchedule: '', location: '', notes: ''
};

export default function LivestockPage() {
  const { isViewOnly } = useAuth();
  const [animals, setAnimals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ species: '', healthStatus: '', search: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.species) params.species = filters.species;
      if (filters.healthStatus) params.healthStatus = filters.healthStatus;
      if (filters.search) params.search = filters.search;
      const [listRes, statsRes] = await Promise.all([
        api.get('/livestock', { params }),
        api.get('/livestock/stats')
      ]);
      setAnimals(listRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load livestock data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filters]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditTarget(null); setModalOpen(true); };
  const openEdit = (a) => { setForm({ ...a }); setEditTarget(a._id); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget) {
        await api.put(`/livestock/${editTarget}`, form);
        toast.success('Livestock record updated');
      } else {
        await api.post('/livestock', form);
        toast.success('Livestock record added');
      }
      closeModal();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id, animalId) => {
    if (!window.confirm(`Archive record for ${animalId}?`)) return;
    try {
      await api.delete(`/livestock/${id}`);
      toast.success('Livestock record archived');
      fetchData();
    } catch {
      toast.error('Failed to archive');
    }
  };

  const healthBadge = (s) => {
    const map = { Healthy: 'success', Sick: 'danger', 'Under Treatment': 'warning', Quarantined: 'warning', Deceased: 'default' };
    return <Badge variant={map[s] || 'default'}>{s}</Badge>;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Livestock Management</h1>
          <p>Track and manage all your farm animals</p>
        </div>
        {!isViewOnly && <Button icon={<Plus size={16} />} onClick={openAdd}>Add Animal</Button>}
      </div>

      {/* Stats row */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <StatCard label="Total Animals" value={stats.total} icon={<Beef size={22} />} variant="primary" />
          {stats.bySpecies?.map((s) => (
            <StatCard key={s._id} label={s._id} value={s.count} icon={<Beef size={22} />} variant="default" />
          ))}
        </div>
      )}

      <Card>
        <CardHeader title="All Livestock" subtitle={`${animals.length} record${animals.length !== 1 ? 's' : ''}`} />

        {/* Filters */}
        <div className="filter-bar">
          <input
            className="form-input search-input"
            placeholder="Search by Animal ID…"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            aria-label="Search livestock by ID"
          />
          <select className="form-input" value={filters.species}
            onChange={(e) => setFilters((p) => ({ ...p, species: e.target.value }))}
            aria-label="Filter by species">
            <option value="">All Species</option>
            {SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-input" value={filters.healthStatus}
            onChange={(e) => setFilters((p) => ({ ...p, healthStatus: e.target.value }))}
            aria-label="Filter by health status">
            <option value="">All Health</option>
            {HEALTH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? <Spinner /> : animals.length === 0 ? (
          <EmptyState icon={<Beef size={48} />} title="No livestock records"
            message="Add your first animal to get started."
            action={!isViewOnly && <Button icon={<Plus size={16} />} onClick={openAdd}>Add Animal</Button>} />
        ) : (
          <Table>
            <TableHead columns={[
              { label: 'Animal ID' }, { label: 'Species' }, { label: 'Breed' },
              { label: 'Gender' }, { label: 'Health Status' }, { label: 'Location' },
              { label: 'Feeding Schedule' },
            ]} />
            <tbody>
              {animals.map((a) => (
                <tr key={a._id}>
                  <td><strong>{a.animalId}</strong></td>
                  <td>{a.species}</td>
                  <td>{a.breed || '—'}</td>
                  <td>{a.gender}</td>
                  <td>{healthBadge(a.healthStatus)}</td>
                  <td>{a.location || '—'}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.feedingSchedule || '—'}
                  </td>
                  {!isViewOnly && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleArchive(a._id, a.animalId)}
                          style={{ color: 'var(--color-danger)' }}>Archive</Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editTarget ? 'Edit Livestock Record' : 'Add New Animal'} size="lg">
        <form onSubmit={handleSave}>
          <div className="form-row">
            <Input label="Animal ID" name="animalId" value={form.animalId} onChange={handleChange}
              placeholder="e.g. COW-001" required />
            <Select label="Species" name="species" value={form.species} onChange={handleChange} required>
              {SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="form-row" style={{ marginTop: '1rem' }}>
            <Input label="Breed" name="breed" value={form.breed} onChange={handleChange} placeholder="e.g. Ankole" />
            <Select label="Gender" name="gender" value={form.gender} onChange={handleChange}>
              <option value="Unknown">Unknown</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
          </div>
          <div className="form-row" style={{ marginTop: '1rem' }}>
            <Select label="Health Status" name="healthStatus" value={form.healthStatus} onChange={handleChange}>
              {HEALTH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Input label="Location / Paddock" name="location" value={form.location} onChange={handleChange}
              placeholder="e.g. Paddock A" />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <Input label="Feeding Schedule" name="feedingSchedule" value={form.feedingSchedule}
              onChange={handleChange} placeholder="e.g. 7 AM and 5 PM daily" />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label className="form-label" htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" className="form-input" value={form.notes}
              onChange={handleChange} placeholder="Any additional notes…" rows={3} />
          </div>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={saving}>{editTarget ? 'Update Record' : 'Add Animal'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
