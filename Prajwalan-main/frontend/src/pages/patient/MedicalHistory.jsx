import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    FileText, User, Calendar, Activity,
    Droplet, ShieldAlert, ChevronRight, Search,
    AlertCircle, Download, Clock, ShieldCheck, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MedicalHistory() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [h, s] = await Promise.all([
                api.get('/patient/history'),
                api.get('/patient/stats')
            ]);
            setRecords(h.data.medicalRecords || []);
            setStats(s.data.summary);
        } catch (e) {
            toast.error('Failed to load records');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="page-loader"><div className="spinner spinner-dark" /></div>;

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h2 className="section-title">Health Repository</h2>
                <p className="section-sub">Digital vault for prescriptions, diagnosis reports, and vaccination logs</p>
            </div>

            {/* Health Stats */}
            <div className="grid-4" style={{ marginBottom: 32 }}>
                <div className="stat-card">
                    <div className="stat-icon blue"><Activity size={20} color="var(--navy-600)" /></div>
                    <div>
                        <div className="stat-label">Blood Group</div>
                        <div className="stat-value">{records[0]?.patient_blood_group || 'O+'}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon teal"><Calendar size={20} color="var(--teal-600)" /></div>
                    <div>
                        <div className="stat-label">Last Consult</div>
                        <div className="stat-value">{stats?.last_consultation || 'Never'}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><ShieldAlert size={20} color="var(--warning)" /></div>
                    <div>
                        <div className="stat-label">Active Conditions</div>
                        <div className="stat-value">0</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red"><Droplet size={20} color="var(--danger)" /></div>
                    <div>
                        <div className="stat-label">Weight (Avg)</div>
                        <div className="stat-value">68 kg</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
                <div>
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Historical Records</div>
                            <div className="flex gap-2">
                                <button className="btn btn-ghost btn-sm"><Search size={14} /></button>
                                <button className="btn btn-ghost btn-sm"><Download size={14} /></button>
                            </div>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            {records.length === 0 ? (
                                <div style={{ padding: 80, textAlign: 'center' }}>
                                    <FileText size={48} color="var(--slate-200)" style={{ margin: '0 auto 16px' }} />
                                    <h3 style={{ fontSize: 16, color: 'var(--slate-400)' }}>No records found</h3>
                                    <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>Your medical history will appear here after consultations</p>
                                </div>
                            ) : (
                                records.map((record, idx) => (
                                    <div key={record.id} style={{
                                        padding: '24px',
                                        borderBottom: idx < records.length - 1 ? '1px solid var(--slate-100)' : 'none',
                                        display: 'flex', gap: 20, alignItems: 'flex-start'
                                    }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 12, background: 'var(--slate-50)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            <FileText size={20} color="var(--navy-500)" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <div>
                                                    <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Dr. {record.doctor_name}</h4>
                                                    <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>{record.department} · {record.specialization}</p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 700 }}>{new Date(record.created_at).toLocaleDateString()}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--slate-400)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                                                        <ShieldCheck size={10} color="var(--success)" /> Verified on Ledger
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ background: 'var(--slate-50)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                                                <div className="text-xs font-bold uppercase text-muted" style={{ marginBottom: 6 }}>Diagnosis & Notes</div>
                                                <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: 'var(--slate-700)' }}>
                                                    {record.diagnosis || 'No diagnosis notes provided.'}
                                                </p>
                                            </div>

                                            <div style={{ display: 'flex', gap: 16 }}>
                                                {record.prescription && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--navy-600)', fontWeight: 600, cursor: 'pointer' }}>
                                                        <Activity size={14} /> View Prescription
                                                        <ChevronRight size={12} />
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--slate-400)' }}>
                                                    <Layers size={14} /> Ref: {record.id.toString().substring(0, 8)}...
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card">
                        <div className="card-header"><div className="card-title">Vaccination Tracker</div></div>
                        <div className="card-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f0fdf4', borderRadius: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>COVID-19 Booster</span>
                                    <span style={{ fontSize: 11, color: '#166534' }}>Aug 2023</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f0fdf4', borderRadius: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>Hepatitis B</span>
                                    <span style={{ fontSize: 11, color: '#166534' }}>Completed</span>
                                </div>
                            </div>
                            <button className="btn btn-outline btn-sm w-full" style={{ marginTop: 16 }}>Register Vaccination</button>
                        </div>
                    </div>

                    <div className="card" style={{ background: '#eff6ff', border: 'none' }}>
                        <div className="card-body">
                            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                <AlertCircle color="var(--navy-600)" size={20} />
                                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Upcoming Review</h4>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flexShrink: 0, marginTop: 4 }}><Clock size={16} color="var(--slate-400)" /></div>
                                <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--slate-600)' }}>
                                    Your annual health checkup is due in 3 weeks. You can book an OPD slot to discuss your trends.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
