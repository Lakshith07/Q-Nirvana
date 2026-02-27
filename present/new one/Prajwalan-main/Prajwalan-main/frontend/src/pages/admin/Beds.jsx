import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Bed, Plus, Search, Filter,
    MoreVertical, Trash2, Edit2,
    CheckCircle, AlertCircle, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminBeds() {
    const [beds, setBeds] = useState([]);
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newBed, setNewBed] = useState({
        ward_name: '', room_number: '', bed_number: '',
        bed_type: 'General', floor_number: 1, charge_per_day: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/beds');
            setBeds(res.data.beds || []);
            setSummary(res.data.summary || []);
        } catch (e) {
            toast.error('Failed to sync bed inventory');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/beds', newBed);
            toast.success('New bed added to inventory');
            setShowAdd(false);
            loadData();
        } catch (e) {
            toast.error('Failed to add bed');
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await api.patch(`/admin/beds/${id}`, { status });
            toast.success('Bed status updated');
            loadData();
        } catch (e) {
            toast.error('Update failed');
        }
    };

    if (loading && beds.length === 0) return <div className="page-loader"><div className="spinner spinner-dark" /></div>;

    return (
        <div>
            <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="section-title">Hospital Bed Management</h2>
                    <p className="section-sub">Manage ward assignments, room inventory, and occupancy tracking</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                    <Plus size={16} /> Add New Bed
                </button>
            </div>

            <div className="grid-4" style={{ marginBottom: 32 }}>
                {summary.map(s => (
                    <div key={s.ward_name + s.bed_type} className="stat-card">
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 4 }}>{s.ward_name} ({s.bed_type})</div>
                            <div style={{ fontSize: 22, fontWeight: 800 }}>{s.available} / {s.total} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--slate-400)' }}>Free</span></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Bed Info</th>
                                <th>Type</th>
                                <th>Ward / Floor</th>
                                <th>Status</th>
                                <th>Base Charge</th>
                                <th style={{ width: 140 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {beds.map(bed => (
                                <tr key={bed.id}>
                                    <td>
                                        <div style={{ fontWeight: 700 }}>Bed #{bed.bed_number}</div>
                                        <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Room {bed.room_number}</div>
                                    </td>
                                    <td><span className="badge badge-gray">{bed.bed_type}</span></td>
                                    <td>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{bed.ward_name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--slate-400)' }}>Floor {bed.floor_number}</div>
                                    </td>
                                    <td>
                                        <select
                                            className="form-select btn-sm"
                                            style={{ width: 110, fontSize: 12, padding: '4px 8px' }}
                                            value={bed.status}
                                            onChange={(e) => updateStatus(bed.id, e.target.value)}
                                        >
                                            <option value="available">Available</option>
                                            <option value="occupied">Occupied</option>
                                            <option value="maintenance">Maintenance</option>
                                        </select>
                                    </td>
                                    <td>₹{bed.charge_per_day}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn btn-ghost btn-sm" style={{ padding: 6 }}><Edit2 size={14} /></button>
                                            <button className="btn btn-ghost btn-sm" style={{ padding: 6, color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAdd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ maxWidth: 500, width: '100%' }}>
                        <div className="card-header"><div className="card-title">Register New Bed</div></div>
                        <form onSubmit={handleAdd} className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Ward Name</label>
                                    <input className="form-input" required value={newBed.ward_name} onChange={e => setNewBed({ ...newBed, ward_name: e.target.value })} placeholder="e.g. ICU-A" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Room Number</label>
                                    <input className="form-input" required value={newBed.room_number} onChange={e => setNewBed({ ...newBed, room_number: e.target.value })} placeholder="301" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Bed Number</label>
                                    <input className="form-input" required value={newBed.bed_number} onChange={e => setNewBed({ ...newBed, bed_number: e.target.value })} placeholder="B-12" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Bed Type</label>
                                    <select className="form-select" value={newBed.bed_type} onChange={e => setNewBed({ ...newBed, bed_type: e.target.value })}>
                                        <option>General</option>
                                        <option>ICU</option>
                                        <option>Ventilator</option>
                                        <option>Oxygen</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Charge per Day (₹)</label>
                                <input type="number" className="form-input" required value={newBed.charge_per_day} onChange={e => setNewBed({ ...newBed, charge_per_day: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                <button type="button" className="btn btn-outline flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary flex-1">Save Bed Info</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
