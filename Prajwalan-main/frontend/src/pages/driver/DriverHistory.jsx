import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Clock, ShieldAlert, MapPin, CheckCircle,
    XCircle, ChevronRight, Phone, Calendar,
    Navigation, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriverHistory() {
    const [emergencies, setEmergencies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/driver/my-emergencies');
            // Filter only completed for "History", though we can show all if we want
            setEmergencies(res.data.emergencies || []);
        } catch (err) {
            toast.error('Failed to load mission history');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed': return <span className="badge badge-green">Completed</span>;
            case 'requested': return <span className="badge badge-red pulse">Critical</span>;
            case 'accepted': return <span className="badge badge-blue">Accepted</span>;
            case 'en_route': return <span className="badge badge-orange">En Route</span>;
            case 'picked_up': return <span className="badge badge-teal">Patient on Board</span>;
            case 'at_hospital': return <span className="badge badge-purple">At Hospital</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    return (
        <div>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="section-title">Mission Log</h2>
                    <p className="section-sub">History of emergency dispatches and active missions</p>
                </div>
                <div className="flex gap-4">
                    <div className="stat-label">Total Missions: <strong>{emergencies.length}</strong></div>
                    <div className="stat-label">Last Mission: <strong>{emergencies[0] ? new Date(emergencies[0].created_at).toLocaleDateString() : 'None'}</strong></div>
                </div>
            </div>

            {loading ? (
                <div className="card py-20 text-center">
                    <div className="spinner mx-auto mb-4" />
                    <p className="text-muted">Loading dispatch logs...</p>
                </div>
            ) : emergencies.length === 0 ? (
                <div className="card py-20 text-center">
                    <ShieldAlert size={64} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-500 font-bold mb-2">No Mission History</p>
                    <p className="text-slate-400 text-sm">Your emergency dispatch history will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {emergencies.map(e => (
                        <div key={e.id} className="card hover-grow border-left-4" style={{
                            borderLeft: `4px solid ${e.status === 'completed' ? 'var(--success)' : 'var(--danger)'}`
                        }}>
                            <div className="card-body">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${e.status === 'completed' ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'}`}>
                                            <Activity size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-lg">{e.patient_name}</h3>
                                                {getStatusBadge(e.status)}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                                <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(e.created_at).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1"><Clock size={14} /> {new Date(e.created_at).toLocaleTimeString()}</span>
                                                <span className="flex items-center gap-1"><Phone size={14} /> {e.patient_mobile}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-bold text-muted uppercase">Mission ID</span>
                                        <div className="text-xs font-mono text-slate-400">{e.id.substring(0, 13)}</div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-4 flex gap-8 items-center">
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-muted uppercase mb-1">Pickup Location</p>
                                        <p className="font-semibold text-sm flex items-center gap-2">
                                            <MapPin size={14} className="text-danger" />
                                            {e.pickup_address || 'Current Coordinates Lat/Lng'}
                                        </p>
                                    </div>
                                    <div className="w-12 flex justify-center text-slate-300">
                                        <ChevronRight size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-muted uppercase mb-1">Destination</p>
                                        <p className="font-semibold text-sm flex items-center gap-2">
                                            <Navigation size={14} className="text-navy" />
                                            Q Nirvana General Hospital
                                        </p>
                                    </div>
                                    {e.status === 'completed' && (
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-muted uppercase mb-1">Total Time</p>
                                            <p className="font-bold text-success">Finished</p>
                                        </div>
                                    )}
                                </div>

                                {e.description && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 italic text-sm text-slate-500">
                                        "{e.description}"
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
