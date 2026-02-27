import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
    Users, Activity, Bed, Droplets, ShieldAlert,
    Calendar, TrendingUp, UserPlus, FileText, Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();

        // Real-time updates via WebSocket
        const wsUrl = `ws://localhost:5000?userId=${user?.id}`;
        let ws;

        const connectWS = () => {
            ws = new WebSocket(wsUrl);

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'UPDATE_DASHBOARD') {
                        console.log('🔄 Dashboard update received:', data.section);
                        loadData();
                    }
                } catch (err) {
                    console.error('WS parse error:', err);
                }
            };

            ws.onclose = () => {
                console.log('🔌 WS disconnected. Retrying in 5s...');
                setTimeout(connectWS, 5000);
            };

            ws.onerror = (err) => {
                console.error('WS error:', err);
                ws.close();
            };
        };

        if (user?.id) connectWS();

        return () => {
            if (ws) ws.close();
        };
    }, [user?.id]);

    const loadData = async () => {
        // setLoading(true); // Don't show full loader for background refreshes
        try {
            const res = await api.get('/admin/dashboard');
            setStats(res.data.dashboard);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load admin stats');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="page-loader">
                <div className="spinner spinner-dark" />
                <p className="text-muted">Initializing system oversight...</p>
            </div>
        );
    }

    const {
        total_patients, total_doctors, total_drivers,
        beds, emergencies, today_appointments, low_blood_stock, o2_in_use
    } = stats;

    const availableBeds = beds.find(b => b.status === 'available')?.count || 0;
    const pendingEmergencies = emergencies.find(e => e.status === 'requested')?.count || 0;

    return (
        <div>
            {/* Header / Meta */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="section-title">System Overview</h2>
                    <p className="section-sub">Real-time monitoring of Q Nirvana Hospital operations</p>
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                    <button className="btn btn-outline btn-sm"><Settings size={14} /> System Config</button>
                    <button className="btn btn-primary btn-sm"><UserPlus size={14} /> Add Staff</button>
                </div>
            </div>

            {/* Core Stats */}
            <div className="grid-6" style={{ marginBottom: 28 }}>
                <div className="stat-card">
                    <div className="stat-icon blue"><Users size={22} color="var(--navy-600)" /></div>
                    <div>
                        <div className="stat-label">Total Patients</div>
                        <div className="stat-value">{total_patients}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon teal"><Activity size={22} color="var(--teal-600)" /></div>
                    <div>
                        <div className="stat-label">Active Doctors</div>
                        <div className="stat-value">{total_doctors}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><Users size={22} color="var(--child)" /></div>
                    <div>
                        <div className="stat-label">Ambulance Fleet</div>
                        <div className="stat-value">{total_drivers}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple"><Bed size={22} color="var(--senior)" /></div>
                    <div>
                        <div className="stat-label">Available Beds</div>
                        <div className="stat-value">{availableBeds}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red"><ShieldAlert size={22} color="var(--danger)" /></div>
                    <div>
                        <div className="stat-label">Active Alerts</div>
                        <div className="stat-value">{pendingEmergencies}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple"><Droplets size={22} color="var(--teal-500)" /></div>
                    <div>
                        <div className="stat-label">O2 in Use</div>
                        <div className="stat-value">{o2_in_use}</div>
                    </div>
                </div>
            </div>

            <div className="grid-2">
                {/* Crowd Management - Floor Density */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Users size={18} className="text-navy" />
                            <div className="card-title">Crowd Control & Floor Density</div>
                        </div>
                        <div className="badge badge-teal">Live Monitoring</div>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {(stats.floor_density || []).map(f => (
                                <div key={f.floor}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                                        <div>
                                            <span style={{ fontWeight: 700, fontSize: 13 }}>Level {f.floor}</span>
                                            <span style={{ fontSize: 11, color: 'var(--slate-400)', marginLeft: 8 }}>{f.status}</span>
                                        </div>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: f.count > f.capacity * 0.8 ? 'var(--danger)' : 'var(--navy-600)' }}>
                                            {f.count} / {f.capacity} Patients
                                        </span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 6 }}>
                                        <div className={`progress-fill ${f.count > f.capacity * 0.8 ? 'danger' : ''}`}
                                            style={{ width: `${(f.count / f.capacity) * 100}%` }}
                                        />
                                    </div>
                                    {f.count > f.capacity * 0.8 && (
                                        <button className="btn btn-ghost btn-sm w-full" style={{ marginTop: 10, borderColor: 'var(--danger-light)', color: 'var(--danger)', fontSize: 10 }}>
                                            ⚡ Reassign Staff to Floor {f.floor}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bed Status */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Hospital Bed Inventory</div>
                        <Link to="/admin/beds" className="btn btn-ghost btn-sm">Manage</Link>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            {beds.map(b => (
                                <div key={b.status} style={{ padding: 16, borderRadius: 12, background: 'var(--slate-50)', border: '1px solid var(--slate-200)' }}>
                                    <div style={{ fontSize: 12, color: 'var(--slate-500)', textTransform: 'capitalize', marginBottom: 4 }}>{b.status}</div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)' }}>{b.count}</div>
                                </div>
                            ))}
                        </div>
                        <div className="alert alert-info" style={{ marginTop: 20 }}>
                            <TrendingUp size={16} />
                            <span>Occupancy is at <strong>72%</strong> today. Normal for a weekday.</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid-2" style={{ marginTop: 28 }}>
                {/* Blood Bank Low Stock */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Critical Blood Inventory</div>
                        <Link to="/admin/blood-bank" className="btn btn-ghost btn-sm">Full Stock</Link>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        {low_blood_stock.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center' }}>
                                <p className="text-muted">All blood groups are well-stocked.</p>
                            </div>
                        ) : (
                            low_blood_stock.map(b => (
                                <div key={b.blood_group} style={{ padding: '16px 24px', borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div className="bg-blood critical" style={{ width: 32, height: 32, fontSize: 12 }}>{b.blood_group}</div>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{b.blood_group} Negative</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, color: 'var(--danger)' }}>{b.units_available} Units</div>
                                        <div style={{ fontSize: 11, color: 'var(--slate-400)' }}>Critical threshold: 10</div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div style={{ padding: 16 }}>
                            <button className="btn btn-danger btn-sm w-full">🚨 Send Stock Request</button>
                        </div>
                    </div>
                </div>

                <div className="grid-3" style={{ marginTop: 28 }}>
                    {/* Today's Appointments Summary */}
                    <div className="card">
                        <div className="card-header"><div className="card-title">Today's OPD Status</div></div>
                        <div className="card-body">
                            {today_appointments.map(a => (
                                <div key={a.status} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--slate-50)' }}>
                                    <span className="text-sm text-muted text-capitalize">{a.status}</span>
                                    <span className="font-bold">{a.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Health */}
                    <div className="card">
                        <div className="card-header"><div className="card-title">System Health</div></div>
                        <div className="card-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span className="text-xs font-bold">API STABILITY</span>
                                        <span className="text-xs text-success">99.9%</span>
                                    </div>
                                    <div className="progress-bar"><div className="progress-fill success" style={{ width: '99%' }} /></div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span className="text-xs font-bold">DB LOAD</span>
                                        <span className="text-xs text-warning">12%</span>
                                    </div>
                                    <div className="progress-bar"><div className="progress-fill" style={{ width: '12%' }} /></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Audit Mini Log */}
                    <div className="card">
                        <div className="card-header"><div className="card-title">Recent Activity</div></div>
                        <div className="card-body" style={{ padding: '12px 24px' }}>
                            {[
                                { user: 'Admin', act: 'Added ICU Bed #402', time: '5m ago' },
                                { user: 'Doctor', act: 'Consultation completed', time: '12m ago' },
                                { user: 'Admin', act: 'Updated user permissions', time: '1h ago' }
                            ].map((l, i) => (
                                <div key={i} style={{ padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--slate-50)' : 'none' }}>
                                    <div style={{ fontSize: 12, fontWeight: 700 }}>{l.user} <span style={{ fontWeight: 400, color: 'var(--slate-500)' }}>{l.act}</span></div>
                                    <div style={{ fontSize: 10, color: 'var(--slate-400)' }}>{l.time}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
