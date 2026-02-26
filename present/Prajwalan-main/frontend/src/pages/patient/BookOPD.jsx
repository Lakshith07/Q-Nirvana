import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, Filter, Search, Star, Stethoscope, User } from 'lucide-react';

export default function BookOPD() {
    const [doctors, setDoctors] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [form, setForm] = useState({
        doctor_id: '', appointment_date: '', appointment_time: '',
        reason: '', is_emergency: false, is_maternity: false,
    });
    const [loading, setLoading] = useState(false);
    const [booking, setBooking] = useState(false);
    const [booked, setBooked] = useState(null);

    useEffect(() => { loadDoctors(); }, []);
    useEffect(() => {
        setFiltered(doctors.filter(d =>
            d.full_name.toLowerCase().includes(search.toLowerCase()) ||
            d.specialization?.toLowerCase().includes(search.toLowerCase())
        ));
    }, [search, doctors]);

    const loadDoctors = async () => {
        setLoading(true);
        try {
            const res = await api.get('/patient/doctors');
            setDoctors(res.data.doctors);
            setFiltered(res.data.doctors);
        } catch (e) {
            toast.error('Failed to load doctors');
        } finally {
            setLoading(false);
        }
    };

    const selectDoctor = (doc) => {
        setSelectedDoc(doc);
        setForm(f => ({ ...f, doctor_id: doc.id }));
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!form.doctor_id || !form.appointment_date || !form.appointment_time)
            return toast.error('Doctor, date and time are required');
        setBooking(true);
        try {
            const res = await api.post('/patient/appointments', form);
            setBooked(res.data.appointment);
            toast.success('Appointment booked! Confirmation email sent 📧');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Booking failed');
        } finally {
            setBooking(false);
        }
    };

    const PRIORITY_OPTIONS = [
        { value: 'general', label: 'General Consultation', score: 50 },
        { value: 'maternity', label: 'Maternity / Pregnancy', score: 80 },
    ];

    // Time slots
    const SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

    if (booked) {
        return (
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
                <div className="card">
                    <div style={{ padding: '48px 36px', textAlign: 'center' }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 36 }}>
                            ✅
                        </div>
                        <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--slate-900)', marginBottom: 8 }}>Appointment Booked!</h2>
                        <p style={{ color: 'var(--slate-500)', marginBottom: 28 }}>Your confirmation has been sent to your email.</p>

                        <div style={{ background: 'var(--slate-50)', borderRadius: 12, padding: '20px 24px', textAlign: 'left', marginBottom: 28 }}>
                            {[
                                { l: 'Queue Number', v: `#${booked.queue_position}` },
                                { l: 'Date', v: booked.appointment_date },
                                { l: 'Time', v: booked.appointment_time },
                                { l: 'Est. Wait', v: `${booked.estimated_wait_minutes} mins` },
                                { l: 'Priority', v: booked.priority },
                            ].map(r => (
                                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--slate-200)', fontSize: 14 }}>
                                    <span style={{ color: 'var(--slate-500)' }}>{r.l}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--slate-900)', textTransform: 'capitalize' }}>{r.v}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn btn-outline" onClick={() => { setBooked(null); setSelectedDoc(null); setForm({ doctor_id: '', appointment_date: '', appointment_time: '', reason: '', is_emergency: false, is_maternity: false }); }}>
                                Book Another
                            </button>
                            <a href="/patient/queue" className="btn btn-primary">View Queue Status</a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2 className="section-title">Book OPD Appointment</h2>
                <p className="section-sub">Select a doctor and book your consultation slot</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: !selectedDoc ? '1fr' : '1fr 380px', gap: 24, alignItems: 'start' }}>
                {/* Doctor List */}
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <div className="input-group">
                            <Search className="input-icon-left" size={16} />
                            <input
                                className="form-input"
                                placeholder="Search by name or specialization…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <div className="spinner spinner-dark" style={{ margin: '0 auto' }} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {filtered.map(doc => (
                                <div key={doc.id}
                                    onClick={() => selectDoctor(doc)}
                                    style={{
                                        background: 'white', border: `2px solid ${selectedDoc?.id === doc.id ? 'var(--navy-500)' : 'var(--slate-200)'}`,
                                        borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', gap: 16,
                                    }}>
                                    <div className="avatar avatar-lg">{doc.full_name.slice(0, 2).toUpperCase()}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                            <span style={{ fontWeight: 700, fontSize: 16 }}>Dr. {doc.full_name}</span>
                                            <span className={`badge badge-${doc.is_available ? 'green' : 'red'}`}>
                                                {doc.is_available ? 'Available' : 'Busy'}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: 0 }}>
                                            {doc.specialization} {doc.department ? `· ${doc.department}` : ''} · {doc.experience_years}yr exp
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                                            <Star size={12} color="#f59e0b" fill="#f59e0b" />
                                            <span style={{ fontSize: 12, color: 'var(--slate-600)', fontWeight: 600 }}>{doc.rating || '4.5'}</span>
                                            <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>· ₹{doc.consultation_fee || '300'} fee</span>
                                        </div>
                                    </div>
                                    {selectedDoc?.id === doc.id && (
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--navy-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', fontSize: 13 }}>✓</div>
                                    )}
                                </div>
                            ))}
                            {filtered.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                                    <Stethoscope size={40} color="var(--slate-300)" style={{ margin: '0 auto 12px' }} />
                                    <p className="text-muted">No doctors found matching "{search}"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Booking form */}
                {selectedDoc && (
                    <div className="card" style={{ position: 'sticky', top: 80 }}>
                        <div className="card-header">
                            <div>
                                <div className="card-title">Book Appointment</div>
                                <div className="card-subtitle">Dr. {selectedDoc.full_name}</div>
                            </div>
                        </div>
                        <form onSubmit={submit} className="card-body">
                            <div className="form-group">
                                <label className="form-label">Date <span className="required">*</span></label>
                                <input type="date" name="appointment_date" value={form.appointment_date}
                                    onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
                                    className="form-input" min={new Date().toISOString().split('T')[0]} required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Time Slot <span className="required">*</span></label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                                    {SLOTS.map(s => (
                                        <button key={s} type="button"
                                            onClick={() => setForm(f => ({ ...f, appointment_time: s }))}
                                            className="btn btn-sm"
                                            style={{
                                                background: form.appointment_time === s ? 'var(--navy-600)' : 'white',
                                                color: form.appointment_time === s ? 'white' : 'var(--slate-700)',
                                                border: `1.5px solid ${form.appointment_time === s ? 'var(--navy-600)' : 'var(--slate-200)'}`,
                                                fontSize: 12,
                                            }}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Reason for Visit</label>
                                <textarea name="reason" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                    className="form-textarea" placeholder="Briefly describe your symptoms…" style={{ minHeight: 80 }} />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                                    <input type="checkbox" checked={form.is_maternity} onChange={e => setForm(f => ({ ...f, is_maternity: e.target.checked }))} style={{ width: 16, height: 16 }} />
                                    <span>🤱 Maternity / Pregnancy visit (Priority: 80)</span>
                                </label>
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                                    <input type="checkbox" checked={form.is_emergency} onChange={e => setForm(f => ({ ...f, is_emergency: e.target.checked }))} style={{ width: 16, height: 16 }} />
                                    <span>🚨 Emergency (Bypasses all queue — Priority: 100)</span>
                                </label>
                            </div>

                            {form.is_emergency && (
                                <div className="alert alert-emergency" style={{ marginBottom: 16 }}>
                                    ⚠️ Emergency patients are immediately moved to the front of queue and the doctor is notified.
                                </div>
                            )}

                            <button type="submit" className={`btn w-full ${form.is_emergency ? 'btn-emergency' : 'btn-primary'}`} disabled={booking}>
                                {booking ? <span className="spinner" /> : null}
                                {booking ? 'Booking…' : '📅 Confirm Appointment'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
