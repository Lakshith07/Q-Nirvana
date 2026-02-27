import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
    Users, Clock, CheckCircle, Activity, Calendar,
    Stethoscope, Bell, AlertCircle, ChevronRight, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function DoctorDashboard() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState({
        total_patients: 0,
        today_appointments: 0,
        waiting_queue: 0,
        completed_today: 0
    });
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        loadData();

        const wsUrl = `ws://localhost:5000?userId=${user?.id}`;
        let ws;

        const connectWS = () => {
            ws = new WebSocket(wsUrl);

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'UPDATE_DASHBOARD') {
                        loadData(true);
                    } else if (data.type === 'NEW_NOTIFICATION' && data.role === 'doctor') {
                        setNotifications(prev => [data.notification, ...prev]);

                        // Trigger native browser push notification if enabled locally
                        if (localStorage.getItem('notifications') !== 'false' && window.Notification && Notification.permission === 'granted') {
                            new Notification('Q Nirvana: ' + data.notification.title, {
                                body: data.notification.sub,
                                icon: '/favicon.ico'
                            });
                        }
                    }
                } catch (err) {
                    console.error('WS parse error:', err);
                }
            };

            ws.onclose = () => {
                setTimeout(connectWS, 5000);
            };
        };

        if (user?.id) connectWS();

        return () => {
            if (ws) ws.close();
        };
    }, [user?.id]);

    const loadData = async (isSilent = false) => {
        setLoading(true);
        try {
            const [p, s, q] = await Promise.all([
                api.get('/doctor/profile').catch(() => ({ data: { profile: {} } })),
                api.get('/doctor/stats').catch(() => ({ data: { stats: stats } })),
                api.get('/doctor/queue').catch(() => ({ data: { queue: [] } }))
            ]);
            if (p.data.profile) setProfile(p.data.profile);
            if (s.data.stats) setStats(s.data.stats);
            setQueue(q.data.queue || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleAvailability = async () => {
        setUpdatingStatus(true);
        try {
            const newStatus = !profile.is_available;
            await api.patch('/doctor/availability', { is_available: newStatus });
            setProfile(prev => ({ ...prev, is_available: newStatus }));
            toast.success(`You are now ${newStatus ? 'Available' : 'Unavailable'}`);
        } catch (e) {
            toast.error('Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    if (loading && !profile) {
        return (
            <div className="page-loader">
                <div className="spinner spinner-dark" />
                <p className="text-muted">Loading your medical workspace...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Top Bar / Welcome */}
            <div style={{
                background: 'linear-gradient(135deg, var(--teal-600), var(--navy-800))',
                borderRadius: 'var(--radius-xl)',
                padding: '32px 36px',
                marginBottom: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <p style={{ opacity: 0.8, fontSize: 13, marginBottom: 4 }}>Welcome back, Doctor</p>
                    <h2 style={{ color: 'white', fontSize: 26, fontWeight: 800, margin: 0 }}>Dr. {user?.full_name}</h2>
                    <p style={{ opacity: 0.8, fontSize: 14, marginTop: 6 }}>
                        {profile?.specialization} · {profile?.department} department
                    </p>
                </div>
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'right' }}>
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Currently {profile?.is_available ? 'Available' : 'Busy'}</span>
                        <div
                            onClick={toggleAvailability}
                            style={{
                                width: 48, height: 24, background: profile?.is_available ? 'var(--teal-400)' : 'rgba(255,255,255,0.2)',
                                borderRadius: 12, position: 'relative', cursor: updatingStatus ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s'
                            }}
                        >
                            <div style={{
                                width: 18, height: 18, background: 'white', borderRadius: '50%',
                                position: 'absolute', top: 3, left: profile?.is_available ? 27 : 3,
                                transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} />
                        </div>
                    </div>
                    <Link to="/doctor/schedule" className="btn btn-sm" style={{ background: 'white', color: 'var(--navy-800)', textDecoration: 'none', fontWeight: 700, borderRadius: 8 }}>
                        <Calendar size={14} /> View Schedule
                    </Link>
                </div>
                {/* Decorative element */}
                <Stethoscope style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1, transform: 'rotate(-15deg)' }} size={160} />
            </div>

            {/* Stats Grid */}
            <div className="grid-4" style={{ marginBottom: 28 }}>
                <div className="stat-card">
                    <div className="stat-icon blue"><Calendar size={22} color="var(--navy-600)" /></div>
                    <div>
                        <div className="stat-label">Total Appointments</div>
                        <div className="stat-value">{stats.total_patients}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><Users size={22} color="var(--child)" /></div>
                    <div>
                        <div className="stat-label">Today's Visits</div>
                        <div className="stat-value">{stats.today_appointments}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple"><Activity size={22} color="var(--senior)" /></div>
                    <div>
                        <div className="stat-label">In Waiting Queue</div>
                        <div className="stat-value">{stats.waiting_queue}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><CheckCircle size={22} color="var(--success)" /></div>
                    <div>
                        <div className="stat-label">Completed Today</div>
                        <div className="stat-value">{stats.completed_today}</div>
                    </div>
                </div>
            </div>

            <div className="grid-2">
                {/* Real-time Queue */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Patient Queue</div>
                            <div className="card-subtitle">Prioritized incoming consultations</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => loadData(true)} className="btn btn-ghost btn-sm" title="Refresh Queue">
                                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                            </button>
                            <Link to="/doctor/queue" className="btn btn-outline btn-sm">Full View</Link>
                        </div>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        {queue.length === 0 ? (
                            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                                <Clock size={48} color="var(--slate-200)" style={{ margin: '0 auto 16px' }} />
                                <h3 style={{ fontSize: 16, color: 'var(--slate-400)' }}>No patients in queue</h3>
                                <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>Queue will populate as patients check in</p>
                            </div>
                        ) : (
                            queue.slice(0, 5).map((p, idx) => (
                                <div key={p.queue_id} style={{
                                    padding: '16px 24px', borderBottom: '1px solid var(--slate-100)',
                                    display: 'flex', alignItems: 'center', gap: 16,
                                    background: idx === 0 ? '#f0fdf4' : 'transparent'
                                }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 10,
                                        background: 'var(--navy-700)',
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 18, fontWeight: 800, flexShrink: 0
                                    }}>
                                        {p.position}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--slate-900)' }}>{p.patient_name}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
                                            {p.gender} · {p.age}yr · {p.reason || 'General Checkup'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await api.patch(`/doctor/queue/${p.queue_id}`, { status: 'completed' });
                                                    toast.success(`Completed ${p.patient_name} ✅`);
                                                    loadData(true);
                                                } catch (e) { toast.error('Completion failed'); }
                                            }}
                                            className="btn btn-green btn-sm"
                                            style={{ padding: '6px 12px' }}
                                        >
                                            Complete
                                        </button>
                                        <Link to="/doctor/queue" className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                                            <ChevronRight size={18} />
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                        {queue.length > 5 && (
                            <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid var(--slate-100)' }}>
                                <Link to="/doctor/queue" style={{ fontSize: 13, color: 'var(--navy-600)', fontWeight: 600 }}>
                                    View {queue.length - 5} more patients...
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent consultations / Alerts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Notifications</div>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {notifications.length === 0 ? (
                                    <p style={{ fontSize: 13, color: 'var(--slate-400)', textAlign: 'center', padding: '20px 0' }}>No new notifications</p>
                                ) : (
                                    notifications.map((n, idx) => (
                                        <div key={n.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: idx === notifications.length - 1 ? 'none' : '1px solid var(--slate-100)' }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--${n.type})`, marginTop: 6 }} />
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{n.title}</p>
                                                <p style={{ fontSize: 11, color: 'var(--slate-500)', margin: '2px 0 0' }}>{n.sub}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {notifications.length > 0 && (
                                <button
                                    onClick={() => setNotifications([])}
                                    className="btn btn-outline btn-sm w-full"
                                    style={{ marginTop: 16 }}
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div >
    );
}
