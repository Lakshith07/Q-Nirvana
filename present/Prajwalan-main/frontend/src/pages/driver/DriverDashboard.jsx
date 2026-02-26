import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
    Truck, ShieldAlert, MapPin, Navigation,
    CheckCircle, Clock, AlertTriangle, Phone,
    Navigation2, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DriverDashboard() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [emergencies, setEmergencies] = useState([]);
    const [activeEmergency, setActiveEmergency] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [p, e, h] = await Promise.all([
                api.get('/driver/profile').catch(() => ({ data: { profile: {} } })),
                api.get('/driver/emergencies').catch(() => ({ data: { emergencies: [] } })),
                api.get('/driver/my-emergencies').catch(() => ({ data: { emergencies: [] } }))
            ]);
            setProfile(p.data.profile);
            setEmergencies(e.data.emergencies || []);

            // Check if there's an ongoing emergency in history
            const ongoing = h.data.emergencies?.find(em => ['accepted', 'en_route', 'picked_up', 'at_hospital'].includes(em.status));
            if (ongoing) setActiveEmergency(ongoing);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const acceptEmergency = async (id) => {
        setActionLoading(true);
        try {
            const res = await api.post(`/driver/emergencies/${id}/accept`);
            setActiveEmergency({ ...res.data.emergency, route_data: res.data.route });
            toast.success('Emergency accepted! Dijkstra route calculated ⚡');
            loadData();
        } catch (err) {
            toast.error('Failed to accept emergency');
        } finally {
            setActionLoading(false);
        }
    };

    const updateStatus = async (status) => {
        setActionLoading(true);
        try {
            await api.patch(`/driver/emergencies/${activeEmergency.id}/status`, { status });
            setActiveEmergency(prev => ({ ...prev, status }));
            toast.success(`Status updated to ${status.replace('_', ' ')}`);
            if (status === 'completed') {
                setActiveEmergency(null);
                loadData();
            }
        } catch (err) {
            toast.error('Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="page-loader">
                <div className="spinner spinner-dark" />
                <p className="text-muted">Connecting to dispatch system...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Driver Status Card */}
            <div style={{
                background: 'linear-gradient(135deg, var(--orange-500), #9a3412)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px 32px',
                marginBottom: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'white'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 16, background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Truck size={32} color="white" />
                    </div>
                    <div>
                        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 800, margin: 0 }}>{user?.full_name}</h2>
                        <p style={{ opacity: 0.9, fontSize: 13, marginTop: 4 }}>
                            {profile?.vehicle_number} · {profile?.vehicle_type} · <span style={{ textTransform: 'capitalize' }}>{profile?.status.replace('_', ' ')}</span>
                        </p>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{
                        display: 'inline-block', padding: '6px 12px', background: 'white',
                        color: '#9a3412', borderRadius: 8, fontSize: 13, fontWeight: 700
                    }}>
                        ON DUTY
                    </span>
                </div>
            </div>

            {activeEmergency ? (
                /* Active Mission View */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
                    <div className="card">
                        <div className="card-header" style={{ background: '#fff1f2', borderBottom: '1px solid #fecdd3' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <ShieldAlert color="var(--danger)" size={20} />
                                <div className="card-title" style={{ color: '#9f1239' }}>Active Emergency Mission</div>
                            </div>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                                <div>
                                    <label className="text-xs font-bold text-muted uppercase">Patient Name</label>
                                    <h3 style={{ fontSize: 20, fontWeight: 800 }}>{activeEmergency.patient_name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--navy-600)', marginTop: 4 }}>
                                        <Phone size={14} />
                                        <span style={{ fontWeight: 600 }}>{activeEmergency.patient_mobile}</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <label className="text-xs font-bold text-muted uppercase">Status</label>
                                    <div className="badge badge-red" style={{ padding: '6px 14px', fontSize: 12 }}>{activeEmergency.status.replace('_', ' ')}</div>
                                </div>
                            </div>

                            <div style={{ background: 'var(--slate-50)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
                                <div style={{ display: 'flex', gap: 20 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--navy-500)', zIndex: 1 }} />
                                        <div style={{ width: 2, flex: 1, background: 'var(--slate-200)', margin: '4px 0' }} />
                                        <div style={{ width: 12, height: 12, background: 'white', border: '3px solid var(--danger)', borderRadius: 2, zIndex: 1 }} />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 28 }}>
                                        <div>
                                            <p className="text-xs font-bold text-muted uppercase" style={{ marginBottom: 4 }}>Pickup Location</p>
                                            <p className="font-semibold">{activeEmergency.pickup_address || 'Patient Current Location'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-muted uppercase" style={{ marginBottom: 4 }}>Destination</p>
                                            <p className="font-semibold">Q Nirvana General Hospital · Emergency Wing</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Dijkstra Stats Placeholder */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                <div style={{ textAlign: 'center', padding: 16, background: '#eff6ff', borderRadius: 12 }}>
                                    <Navigation2 size={20} color="var(--navy-600)" style={{ margin: '0 auto 8px' }} />
                                    <div style={{ fontSize: 16, fontWeight: 800 }}>3.2 km</div>
                                    <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Distance</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: 16, background: '#f0fdf4', borderRadius: 12 }}>
                                    <Clock size={20} color="var(--success)" style={{ margin: '0 auto 8px' }} />
                                    <div style={{ fontSize: 16, fontWeight: 800 }}>8 mins</div>
                                    <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Est. Time</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: 16, background: '#ecfdf5', borderRadius: 12 }}>
                                    <MapPin size={20} color="var(--teal-600)" style={{ margin: '0 auto 8px' }} />
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal-700)' }}>Optimized</div>
                                    <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Route</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header"><div className="card-title">Dispatch Actions</div></div>
                        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {activeEmergency.status === 'accepted' && (
                                <button onClick={() => updateStatus('en_route')} disabled={actionLoading} className="btn btn-primary btn-xl w-full">
                                    {actionLoading ? <span className="spinner" /> : <Navigation size={20} />}
                                    Start Route
                                </button>
                            )}
                            {activeEmergency.status === 'en_route' && (
                                <button onClick={() => updateStatus('picked_up')} disabled={actionLoading} className="btn btn-teal btn-xl w-full">
                                    {actionLoading ? <span className="spinner" /> : <MapPin size={20} />}
                                    Patient Picked Up
                                </button>
                            )}
                            {activeEmergency.status === 'picked_up' && (
                                <button onClick={() => updateStatus('at_hospital')} disabled={actionLoading} className="btn btn-primary btn-xl w-full" style={{ background: 'var(--navy-800)' }}>
                                    {actionLoading ? <span className="spinner" /> : <Truck size={20} />}
                                    Arrived at Hospital
                                </button>
                            )}
                            {activeEmergency.status === 'at_hospital' && (
                                <button onClick={() => updateStatus('completed')} disabled={actionLoading} className="btn btn-green btn-xl w-full" style={{ background: 'var(--success)' }}>
                                    {actionLoading ? <span className="spinner" /> : <CheckCircle size={20} />}
                                    Complete Mission
                                </button>
                            )}

                            <div className="alert alert-warning" style={{ marginTop: 8 }}>
                                <AlertTriangle size={16} />
                                <span style={{ fontSize: 12 }}>Stay on the optimized route to minimize response time.</span>
                            </div>

                            <button className="btn btn-outline w-full" style={{ color: 'var(--danger)', borderColor: 'var(--danger-light)' }}>
                                Emergency Panic Button
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Idle View - Available Requests */
                <div>
                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Incoming Notifications</h3>
                        <p className="text-muted">Real-time emergency requests near you</p>
                    </div>

                    {emergencies.length === 0 ? (
                        <div className="card" style={{ padding: '80px 40px', textAlign: 'center' }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: '50%', background: 'var(--slate-100)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
                            }}>
                                <Navigation size={40} color="var(--slate-300)" />
                            </div>
                            <h3 style={{ color: 'var(--slate-700)', marginBottom: 8 }}>Standing By</h3>
                            <p style={{ color: 'var(--slate-500)', maxWidth: 400, margin: '0 auto' }}>
                                No active emergency requests at the moment. Keep the app open to receive instant alerts.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 20 }}>
                            {emergencies.map(e => (
                                <div key={e.id} className="card" style={{ borderLeft: '5px solid var(--danger)' }}>
                                    <div className="card-body" style={{ padding: 24 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                            <div className="badge badge-red">URGENT EMERGENCY</div>
                                            <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>{new Date(e.created_at).toLocaleTimeString()}</span>
                                        </div>
                                        <h4 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{e.patient_name}</h4>
                                        <p style={{ fontSize: 14, color: 'var(--slate-500)', marginBottom: 20 }}>
                                            Location: {e.pickup_address || 'Current Coordinates Shared'}
                                        </p>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <button
                                                onClick={() => acceptEmergency(e.id)}
                                                disabled={actionLoading}
                                                className="btn btn-primary" style={{ flex: 1 }}
                                            >
                                                Accept Dispatch
                                            </button>
                                            <button className="btn btn-outline">Ignore</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Recent History Mini-table */}
            {!activeEmergency && (
                <div className="card" style={{ marginTop: 32 }}>
                    <div className="card-header">
                        <div className="card-title">Recent Completed Missions</div>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Patient</th>
                                        <th>Date</th>
                                        <th>Time to Hospital</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Rahul Singh</td>
                                        <td>Today</td>
                                        <td>12 mins</td>
                                        <td><span className="badge badge-green">Delivered</span></td>
                                    </tr>
                                    <tr>
                                        <td>Anita Verma</td>
                                        <td>Yesterday</td>
                                        <td>18 mins</td>
                                        <td><span className="badge badge-green">Delivered</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
