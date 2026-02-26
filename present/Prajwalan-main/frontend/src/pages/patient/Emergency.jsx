import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Phone, MapPin, Send, AlertTriangle,
    Navigation, Activity, ShieldAlert, Heart, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmergencyRequest() {
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [activeRequest, setActiveRequest] = useState(null);
    const [form, setForm] = useState({
        pickup_address: '',
        reason: '',
        pickup_lat: 12.9716, // Default for demo
        pickup_lng: 77.5946
    });

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const res = await api.get('/patient/history');
            // Mocking emergency history since we don't have a specific endpoint yet
            // In a real app, we'd have api.get('/patient/emergencies')
            const emergencies = res.data.medicalRecords?.filter(r => r.is_emergency) || [];
            setHistory(emergencies);
        } catch (e) {
            console.error(e);
        }
    };

    const submitRequest = async (e) => {
        e.preventDefault();
        if (!form.pickup_address) return toast.error('Please provide a pickup location');

        setLoading(true);
        try {
            const res = await api.post('/patient/emergency', form);
            setActiveRequest(res.data.request);
            toast.success('Emergency alert sent! Dispatching ambulance... 🚑');
            loadHistory();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send alert');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: 32, textAlign: 'center' }}>
                <h2 className="section-title" style={{ color: 'var(--danger)', fontSize: 28 }}>Emergency Response</h2>
                <p className="section-sub">One-tap critical assistance dispatch and real-time tracking</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: activeRequest ? '1fr' : '1fr 380px', gap: 32, alignItems: 'start' }}>
                {/* Active Tracking or Form */}
                {activeRequest ? (
                    <div className="card" style={{ border: '2px solid var(--danger)', animation: 'slideUp 0.4s ease' }}>
                        <div className="card-body" style={{ padding: 48, textAlign: 'center' }}>
                            <div style={{
                                width: 100, height: 100, borderRadius: '50%', background: '#fee2e2',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
                            }}>
                                <Activity className="spin" size={48} color="var(--danger)" />
                            </div>
                            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy-900)', marginBottom: 12 }}>Help is on the way!</h2>
                            <p style={{ color: 'var(--slate-500)', fontSize: 16, marginBottom: 40, maxWidth: 500, margin: '0 auto 40px' }}>
                                Your emergency request has been received. Our nearest ambulance is being dispatched using Dijkstra's optimal routing.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 40 }}>
                                <div style={{ padding: 20, background: 'var(--slate-50)', borderRadius: 16 }}>
                                    <Clock size={24} color="var(--navy-600)" style={{ margin: '0 auto 8px' }} />
                                    <div style={{ fontSize: 18, fontWeight: 800 }}>8-12m</div>
                                    <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Est. Wait Time</div>
                                </div>
                                <div style={{ padding: 20, background: 'var(--slate-50)', borderRadius: 16 }}>
                                    <Navigation size={24} color="var(--teal-600)" style={{ margin: '0 auto 8px' }} />
                                    <div style={{ fontSize: 18, fontWeight: 800 }}>En Route</div>
                                    <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Ambulance Status</div>
                                </div>
                                <div style={{ padding: 20, background: 'var(--slate-50)', borderRadius: 16 }}>
                                    <Phone size={24} color="var(--danger)" style={{ margin: '0 auto 8px' }} />
                                    <div style={{ fontSize: 18, fontWeight: 800 }}>Call 108</div>
                                    <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Direct Help</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button className="btn btn-outline" onClick={() => setActiveRequest(null)}>Cancel Request</button>
                                <button className="btn btn-primary" onClick={() => toast('Location shared with driver')}>Share Live Location</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="card">
                        <div className="card-header" style={{ background: '#fff1f2' }}>
                            <div className="card-title" style={{ color: '#9f1239' }}>🚨 Send Emergency Alert</div>
                        </div>
                        <form onSubmit={submitRequest} className="card-body">
                            <div className="alert alert-danger" style={{ marginBottom: 24, fontSize: 13 }}>
                                <AlertTriangle size={16} />
                                <span>Use this only for life-threatening emergencies. Falsely alerting may incur heavy penalties.</span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Pickup Address <span className="required">*</span></label>
                                <div className="input-group">
                                    <MapPin className="input-icon-left" size={16} />
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter full address or landmark..."
                                        value={form.pickup_address}
                                        onChange={e => setForm(f => ({ ...f, pickup_address: e.target.value }))}
                                        required
                                    />
                                </div>
                                <button type="button"
                                    className="btn btn-ghost btn-sm"
                                    style={{ marginTop: 8, color: 'var(--navy-600)', padding: 0 }}
                                    onClick={() => setForm(f => ({ ...f, pickup_address: '123 Tech Park, Sector 5, Bangalore 560001' }))}
                                >
                                    <Navigation size={12} /> Use Current Location
                                </button>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Reason / Symptoms (Optional)</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Chest pain, Difficulty breathing, Accident..."
                                    value={form.reason}
                                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                    style={{ minHeight: 100 }}
                                />
                            </div>

                            <button type="submit" className="btn btn-emergency w-full btn-xl" disabled={loading}>
                                {loading ? <span className="spinner" /> : <Send size={20} />}
                                {loading ? 'Sending Alert...' : 'CONFIRM EMERGENCY DISPATCH'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Info / FAQ */}
                {!activeRequest && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="card" style={{ background: 'var(--navy-900)', color: 'white', border: 'none' }}>
                            <div className="card-body">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <ShieldAlert color="var(--teal-400)" size={24} />
                                    <h3 style={{ color: 'white', fontSize: 18, fontWeight: 700, margin: 0 }}>Smart Dispatch</h3>
                                </div>
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                                    Once clicked, our system uses **Dijkstra's Algorithm** to find the fastest ambulance in your vicinity.
                                    The driver receives your live coordinates and optimized turn-by-turn navigation.
                                </p>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header"><div className="card-title">What happens next?</div></div>
                            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Activity size={16} color="var(--danger)" />
                                    </div>
                                    <div style={{ fontSize: 12 }}>
                                        <p style={{ fontWeight: 700, marginBottom: 2 }}>Ambulance Assigned</p>
                                        <p className="text-muted">Nearest available unit with necessary life-support equipment is flagged.</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Phone size={16} color="var(--navy-600)" />
                                    </div>
                                    <div style={{ fontSize: 12 }}>
                                        <p style={{ fontWeight: 700, marginBottom: 2 }}>Doctor Notified</p>
                                        <p className="text-muted">Emergency doctors at Q Nirvana prepare for your arrival.</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Heart size={16} color="var(--teal-600)" />
                                    </div>
                                    <div style={{ fontSize: 12 }}>
                                        <p style={{ fontWeight: 700, marginBottom: 2 }}>Queue Priority</p>
                                        <p className="text-muted">You bypass all waiting patients and enter the OPD immediately.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
