import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
    Users, Activity, Clock, AlertCircle,
    ArrowRight, CheckCircle, Split, Filter,
    Search, Stethoscope
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminQueue() {
    const { user } = useAuth();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadQueue();

        // Real-time updates via WebSocket
        const wsUrl = `ws://localhost:5000?userId=${user?.id || 'admin_emergencies'}`;
        let ws;

        const connectWS = () => {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'UPDATE_DASHBOARD' && (data.section === 'appointments' || data.section === 'queue')) {
                        console.log('🔄 Queue update received');
                        loadQueue();
                    }
                } catch (err) { }
            };
            ws.onclose = () => setTimeout(connectWS, 5000);
        };
        connectWS();

        return () => { if (ws) ws.close(); };
    }, []);

    const loadQueue = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/queue');
            setQueue(res.data.queue || []);
        } catch (e) {
            toast.error('Failed to load live queue');
        } finally {
            setLoading(false);
        }
    };

    const handleReassign = async (appointmentId) => {
        const newDocId = window.prompt('Enter New Doctor ID for reassignment:');
        if (!newDocId) return;
        try {
            await api.post('/admin/assign-opd', { appointment_id: appointmentId, new_doctor_id: newDocId });
            toast.success('Patient reassigned successfully');
            loadQueue();
        } catch (e) {
            toast.error('Reassignment failed');
        }
    };

    const filteredQueue = queue.filter(q =>
        q.patient_name.toLowerCase().includes(filter.toLowerCase()) ||
        q.doctor_name.toLowerCase().includes(filter.toLowerCase()) ||
        q.department.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="section-title">Global Queue Oversight</h2>
                    <p className="section-sub">Real-time monitoring of all outpatient departments</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="stat-label">Patients Waiting: <strong>{queue.length}</strong></div>
                    <div className="status-indicator active">Live Feed</div>
                </div>
            </div>

            <div className="card mb-6">
                <div className="card-body">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            className="form-control pl-10"
                            placeholder="Filter by patient, doctor, or specialty..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-body p-0">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Patient</th>
                                    <th>Check-in</th>
                                    <th>Assigned Doctor</th>
                                    <th>Status</th>
                                    <th className="text-right">Admin Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && queue.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-20">
                                            <div className="spinner mx-auto mb-4" />
                                            <p className="text-muted">Loading queue data...</p>
                                        </td>
                                    </tr>
                                ) : filteredQueue.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-20">
                                            <Activity size={48} className="mx-auto text-slate-200 mb-4" />
                                            <p className="text-muted">No patients currently in active queue</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredQueue.map(q => (
                                        <tr key={q.id}>
                                            <td>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{q.patient_name}</span>
                                                    <span className="text-[10px] text-slate-500 uppercase">{q.gender} · {q.age} yrs</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock size={14} className="text-slate-400" />
                                                    {new Date(q.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                                                        <Stethoscope size={12} className="text-teal-500" />
                                                        {q.doctor_name}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 uppercase">{q.department}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${q.status === 'called' ? 'badge-blue pulse' : 'badge-outline'}`}>
                                                    {q.status === 'called' ? 'BEING SEEN' : 'WAITING'}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <button
                                                    onClick={() => handleReassign(q.appointment_id)}
                                                    className="btn btn-ghost btn-sm text-navy flex items-center gap-1 float-right"
                                                >
                                                    <Split size={14} /> Reassign
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
