import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Clock, User, FileText, ChevronRight,
    CheckCircle, AlertCircle, Search, Filter,
    RefreshCw, MoreVertical, Play, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DoctorQueue() {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('waiting');

    useEffect(() => {
        loadQueue();
        const interval = setInterval(loadQueue, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    const loadQueue = async () => {
        setLoading(true);
        try {
            const res = await api.get('/doctor/queue');
            setQueue(res.data.queue || []);
        } catch (e) {
            toast.error('Failed to sync queue');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (queueId, status) => {
        try {
            await api.patch(`/doctor/queue/${queueId}`, { status });
            toast.success(`Patient marked as ${status}`);
            loadQueue();
        } catch (e) {
            toast.error('Update failed');
        }
    };

    const filtered = queue.filter(p =>
        (p.patient_name.toLowerCase().includes(search.toLowerCase())) &&
        (filterStatus === 'all' || p.status === filterStatus)
    );

    if (loading && queue.length === 0) return <div className="page-loader"><div className="spinner spinner-dark" /></div>;

    return (
        <div>
            <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="section-title">OPD Patient Queue</h2>
                    <p className="section-sub">Prioritized list based on age, condition, and vulnerability</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={loadQueue}>
                    <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Data
                </button>
            </div>

            <div className="card" style={{ marginBottom: 24, padding: 16 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                    <div className="input-group" style={{ flex: 1 }}>
                        <Search className="input-icon-left" size={16} />
                        <input
                            className="form-input"
                            placeholder="Find patient by name..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        {['waiting', 'called', 'completed', 'cancelled'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ textTransform: 'capitalize' }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-wrapper">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th style={{ width: 80 }}>Pos</th>
                                <th>Patient Info</th>
                                <th>Category</th>
                                <th>Time / Appt</th>
                                <th style={{ width: 220 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: 80, textAlign: 'center' }}>
                                        <div style={{ color: 'var(--slate-400)' }}>
                                            <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                            <p>No patients found in the current selection.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((p, idx) => (
                                    <tr key={p.queue_id} style={{
                                        background: p.status === 'called' ? '#eff6ff' : 'transparent',
                                    }}>
                                        <td>
                                            <div style={{
                                                width: 32, height: 32, borderRadius: 8,
                                                background: 'var(--navy-100)',
                                                color: 'var(--navy-800)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                                            }}>
                                                {p.position}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, fontSize: 15 }}>{p.patient_name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>
                                                {p.gender} · {p.age}yrs · ID #{p.patient_id}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span className="badge badge-indigo">General</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.appointment_time}</div>
                                            <div style={{ fontSize: 11, color: 'var(--slate-400)' }}>Checked-in 14m ago</div>
                                        </td>

                                        <td>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {(p.status === 'waiting' || p.status === 'called') && (
                                                    <>
                                                        <button onClick={() => updateStatus(p.queue_id, 'completed')} className="btn btn-green btn-sm flex-1">
                                                            <CheckCircle size={12} /> Complete
                                                        </button>
                                                        <button onClick={() => updateStatus(p.queue_id, 'cancelled')} className="btn btn-outline btn-sm" style={{ padding: '0 8px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                                                            Decline
                                                        </button>
                                                    </>
                                                )}
                                                <button className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                                                    <MoreVertical size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
