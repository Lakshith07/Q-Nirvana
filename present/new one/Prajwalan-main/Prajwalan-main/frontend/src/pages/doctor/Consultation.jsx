import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    User, FileText, ClipboardList, Send,
    Search, Clock, History, Droplet,
    Stethoscope, Pill, AlertCircle, Save, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Consultation() {
    const [queue, setQueue] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [notes, setNotes] = useState({
        diagnosis: '',
        prescription: '',
        advice: '',
        follow_up_date: ''
    });

    useEffect(() => {
        loadQueue();
    }, []);

    const loadQueue = async () => {
        try {
            const res = await api.get('/doctor/queue');
            const inConsultation = res.data.queue?.filter(p => p.status === 'called') || [];
            setQueue(inConsultation);
            if (inConsultation.length > 0 && !selectedPatient) {
                setSelectedPatient(inConsultation[0]);
            }
        } catch (e) {
            toast.error('Failed to load active patients');
        } finally {
            setLoading(false);
        }
    };

    const submitConsultation = async (e) => {
        e.preventDefault();
        if (!selectedPatient) return toast.error('No patient selected');
        if (!notes.diagnosis) return toast.error('Please enter diagnosis notes');

        setSubmitting(true);
        try {
            await api.post('/doctor/consultation', {
                appointment_id: selectedPatient.appointment_id,
                ...notes
            });
            toast.success('Consultation saved! Patient record updated.');
            setNotes({ diagnosis: '', prescription: '', advice: '', follow_up_date: '' });
            setSelectedPatient(null);
            loadQueue();
        } catch (err) {
            toast.error('Failed to save consultation');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="page-loader"><div className="spinner spinner-dark" /></div>;

    return (
        <div>
            <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="section-title">Consultation Workspace</h2>
                    <p className="section-sub">Digital clinical assistant for diagnosis recording and prescription generation</p>
                </div>
                <button onClick={loadQueue} className="btn btn-outline btn-sm" disabled={loading}>
                    <RefreshCw size={14} className={loading && queue.length > 0 ? 'spin' : ''} /> Refresh Patients
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
                {/* Left: Active Patients */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card" style={{ padding: 0 }}>
                        <div className="card-header" style={{ borderBottom: '1px solid var(--slate-100)' }}>
                            <div className="card-title" style={{ fontSize: 14 }}>Checked-in Patients</div>
                        </div>
                        <div className="card-body" style={{ padding: 0, maxHeight: 400, overflowY: 'auto' }}>
                            {queue.length === 0 ? (
                                <div style={{ padding: 32, textAlign: 'center' }}>
                                    <Clock size={32} color="var(--slate-200)" style={{ margin: '0 auto 12px' }} />
                                    <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>Call a patient from the queue to start consulting.</p>
                                </div>
                            ) : (
                                queue.map(p => (
                                    <div
                                        key={p.queue_id}
                                        onClick={() => setSelectedPatient(p)}
                                        style={{
                                            padding: '16px 20px',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid var(--slate-50)',
                                            background: selectedPatient?.queue_id === p.queue_id ? '#eff6ff' : 'transparent',
                                            borderLeft: selectedPatient?.queue_id === p.queue_id ? '3px solid var(--navy-600)' : 'none',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.patient_name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 2 }}>{p.gender} · {p.age}yr · ID #{p.patient_id}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ background: 'var(--navy-900)', color: 'white', border: 'none' }}>
                        <div className="card-body">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                <AlertCircle size={18} color="var(--teal-400)" />
                                <h4 style={{ margin: 0, color: 'white', fontSize: 14 }}>Pro Tip</h4>
                            </div>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                                You can view the patient's full medical history and previous prescriptions from the right panel before prescribing.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main: Consultation Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {!selectedPatient ? (
                        <div className="card" style={{ padding: '100px 40px', textAlign: 'center' }}>
                            <Stethoscope size={64} color="var(--slate-100)" style={{ margin: '0 auto 24px' }} />
                            <h3 style={{ color: 'var(--slate-400)' }}>Select a patient to begin consultation</h3>
                        </div>
                    ) : (
                        <div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div className="card-header" style={{ background: 'var(--slate-50)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div className="card-title">Examining: {selectedPatient.patient_name}</div>
                                    <span className="badge badge-gray" style={{ marginLeft: 10 }}>{selectedPatient.appointment_time} Slot</span>
                                </div>
                            </div>
                            <form onSubmit={submitConsultation} className="card-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                                    <div className="form-group">
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <ClipboardList size={14} /> Clinical Diagnosis <span className="required">*</span>
                                        </label>
                                        <textarea
                                            className="form-textarea"
                                            placeholder="Enter symptoms and primary diagnosis..."
                                            value={notes.diagnosis}
                                            onChange={e => setNotes(n => ({ ...n, diagnosis: e.target.value }))}
                                            style={{ minHeight: 120 }}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Pill size={14} /> Prescription
                                        </label>
                                        <textarea
                                            className="form-textarea"
                                            placeholder="Dose, Frequency, Duration..."
                                            value={notes.prescription}
                                            onChange={e => setNotes(n => ({ ...n, prescription: e.target.value }))}
                                            style={{ minHeight: 120 }}
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 24 }}>
                                    <label className="form-label">Doctor's Advice / Diet</label>
                                    <input
                                        className="form-input"
                                        placeholder="Specific instructions for the patient..."
                                        value={notes.advice}
                                        onChange={e => setNotes(n => ({ ...n, advice: e.target.value }))}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div className="form-group" style={{ margin: 0, width: 200 }}>
                                        <label className="form-label">Follow-up Date</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={notes.follow_up_date}
                                            onChange={e => setNotes(n => ({ ...n, follow_up_date: e.target.value }))}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button type="button" className="btn btn-outline">
                                            <History size={16} /> Patient History
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                                            {submitting ? <span className="spinner" /> : <Save size={16} />}
                                            {submitting ? 'Saving...' : 'Complete Consultation'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
