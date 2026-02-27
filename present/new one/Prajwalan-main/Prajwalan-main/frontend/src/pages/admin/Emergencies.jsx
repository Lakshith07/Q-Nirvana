import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
    ShieldAlert, MapPin, Truck, Activity,
    Clock, Calendar, Phone, CheckCircle,
    Navigation, User, MoreHorizontal, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminEmergencies() {
    const { user } = useAuth();
    const [emergencies, setEmergencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadData();

        // Real-time updates via WebSocket
        const wsUrl = `ws://localhost:5000?userId=${user?.id || 'admin_emergencies'}`;
        let ws;

        const connectWS = () => {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'UPDATE_DASHBOARD' && data.section === 'emergencies') {
                        console.log('🚨 Emergency alert received');
                        loadData();
                    }
                } catch (err) { }
            };
            ws.onclose = () => setTimeout(connectWS, 5000);
        };
        connectWS();

        return () => { if (ws) ws.close(); };
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/emergencies');
            setEmergencies(res.data.emergencies || []);
        } catch (err) {
            toast.error('Failed to load emergency logs');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'requested': return { badge: 'badge-red pulse', label: 'CRITICAL REQUEST', color: 'var(--danger)' };
            case 'accepted': return { badge: 'badge-blue', label: 'DRIVER ASSIGNED', color: 'var(--navy-500)' };
            case 'en_route': return { badge: 'badge-orange', label: 'PICKUP IN PROGRESS', color: 'var(--orange-500)' };
            case 'picked_up': return { badge: 'badge-teal', label: 'PATIENT ON BOARD', color: 'var(--teal-600)' };
            case 'at_hospital': return { badge: 'badge-purple', label: 'ARRIVED AT HOSPITAL', color: 'var(--senior)' };
            case 'completed': return { badge: 'badge-green', label: 'MISSION COMPLETED', color: 'var(--success)' };
            default: return { badge: 'badge-gray', label: status.toUpperCase(), color: 'var(--slate-500)' };
        }
    };

    const filteredEmergencies = filter === 'all'
        ? emergencies
        : emergencies.filter(e => e.status === filter || (filter === 'active' && !['completed', 'cancelled'].includes(e.status)));

    return (
        <div>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="section-title">Emergency Command Center</h2>
                    <p className="section-sub">Oversight of all critical fleet movements and patient dispatches</p>
                </div>
                <div className="flex gap-4">
                    <div className="stat-label">Active Missions: <strong>{emergencies.filter(e => !['completed', 'cancelled'].includes(e.status)).length}</strong></div>
                    <button className="btn btn-danger btn-sm pulse" onClick={loadData}><Activity size={14} /> Refresh Feed</button>
                </div>
            </div>

            <div className="card mb-8">
                <div className="card-body flex gap-6 items-center">
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                        <button
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filter === 'all' ? 'bg-white shadow-sm text-navy' : 'text-slate-500'}`}
                            onClick={() => setFilter('all')}
                        >All Missions</button>
                        <button
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filter === 'active' ? 'bg-white shadow-sm text-danger' : 'text-slate-500'}`}
                            onClick={() => setFilter('active')}
                        >Active Alerts</button>
                        <button
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filter === 'completed' ? 'bg-white shadow-sm text-success' : 'text-slate-500'}`}
                            onClick={() => setFilter('completed')}
                        >Completed</button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center card">
                    <div className="spinner mx-auto mb-4" />
                    <p className="text-muted">Synchronizing with dispatch servers...</p>
                </div>
            ) : filteredEmergencies.length === 0 ? (
                <div className="py-20 text-center card">
                    <ShieldAlert size={64} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-500 font-bold">No emergencies matching your filter</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredEmergencies.map(e => {
                        const style = getStatusStyle(e.status);
                        return (
                            <div key={e.id} className="card overflow-hidden hover:shadow-lg transition-shadow border-left-4" style={{ borderLeft: `4px solid ${style.color}` }}>
                                <div className="card-body p-0">
                                    <div className="flex flex-col md:flex-row">
                                        {/* Status & Patient Column */}
                                        <div className="p-6 md:w-1/3 border-r border-slate-100">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className={style.badge}>{style.label}</span>
                                                <span className="text-[10px] font-mono text-slate-400">{e.id.substring(0, 8)}</span>
                                            </div>
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="avatar-sm bg-red-50 text-danger">{e.patient_name?.charAt(0) || 'P'}</div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{e.patient_name || 'Anonymous Patient'}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1"><Phone size={10} /> {e.patient_mobile}</div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                                <Clock size={12} /> Received: {new Date(e.created_at).toLocaleString()}
                                            </div>
                                        </div>

                                        {/* Logistics Column */}
                                        <div className="p-6 md:w-1/3 border-r border-slate-100 bg-slate-50/50">
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pickup Point</p>
                                                    <p className="text-sm font-bold flex items-center gap-2">
                                                        <MapPin size={14} className="text-danger" />
                                                        {e.pickup_address || 'Coordinates Provided'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Assigned Fleet Item</p>
                                                    <div className="flex items-center gap-2">
                                                        <Truck size={14} className="text-navy" />
                                                        <span className="text-sm font-bold">{e.driver_name || 'WAITING FOR DISPATCH'}</span>
                                                        {e.vehicle_number && <span className="badge badge-outline text-[10px]">{e.vehicle_number}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action/Data Column */}
                                        <div className="p-6 md:w-1/3 flex flex-col justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Emergency Details</p>
                                                <p className="text-xs text-slate-600 line-clamp-2">
                                                    {e.description || 'No additional details provided by solicitor.'}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                                <button className="btn btn-outline btn-sm flex-1">View Route</button>
                                                <button className="btn btn-ghost btn-sm px-2 text-slate-400"><MoreHorizontal size={16} /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
