import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Users, Mail, UserPlus, ShieldCheck, Clock, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FamilyDashboard() {
    const [familyMembers, setFamilyMembers] = useState([]);
    const [sharedWithMe, setSharedWithMe] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('my_access'); // my_access | shared_with_me
    const [showAdd, setShowAdd] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', relation: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [accessRes, sharedRes] = await Promise.all([
                api.get('/patient/family-access'),
                api.get('/patient/shared-with-me')
            ]);
            setFamilyMembers(accessRes.data.familyAccess || []);
            setSharedWithMe(sharedRes.data.sharedData || []);
        } catch (e) {
            toast.error('Failed to load family access data');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        try {
            await api.post('/patient/family-access', {
                family_member_name: formData.name,
                family_member_email: formData.email,
                relation: formData.relation
            });
            toast.success('Access granted successfully!');
            setShowAdd(false);
            setFormData({ name: '', email: '', relation: '' });
            loadData();
        } catch (e) {
            toast.error('Failed to grant access');
        }
    };

    if (loading) return <div className="page-loader"><div className="spinner" /></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
                <div>
                    <h2 className="section-title">Family Access Control</h2>
                    <p className="section-sub">Manage who can view your real-time medical status and reports</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                    <UserPlus size={18} /> Grant New Access
                </button>
            </div>

            <div className="grid-3" style={{ marginBottom: 32 }}>
                <div className="stat-card">
                    <div className="stat-icon blue"><Users size={22} color="var(--navy-600)" /></div>
                    <div>
                        <div className="stat-label">Active Access</div>
                        <div className="stat-value">{familyMembers.length}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon teal"><ShieldCheck size={22} color="var(--teal-600)" /></div>
                    <div>
                        <div className="stat-label">System Security</div>
                        <div className="stat-value">Active</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 24, borderBottom: '1px solid var(--slate-100)' }}>
                <button
                    onClick={() => setActiveTab('my_access')}
                    style={{
                        padding: '12px 16px',
                        fontSize: 14,
                        fontWeight: 700,
                        color: activeTab === 'my_access' ? 'var(--navy-600)' : 'var(--slate-400)',
                        borderBottom: activeTab === 'my_access' ? '2px solid var(--navy-600)' : 'none',
                        background: 'none',
                        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Granted Access
                </button>
                <button
                    onClick={() => setActiveTab('shared_with_me')}
                    style={{
                        padding: '12px 16px',
                        fontSize: 14,
                        fontWeight: 700,
                        color: activeTab === 'shared_with_me' ? 'var(--navy-600)' : 'var(--slate-400)',
                        borderBottom: activeTab === 'shared_with_me' ? '2px solid var(--navy-600)' : 'none',
                        background: 'none',
                        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Shared with Me ({sharedWithMe.length})
                </button>
            </div>

            {activeTab === 'my_access' ? (
                <div className="card">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Family Member</th>
                                    <th>Relationship</th>
                                    <th>Access Date</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {familyMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '100px 0', color: 'var(--slate-400)' }}>
                                            No family members have access to your records yet.
                                        </td>
                                    </tr>
                                ) : familyMembers.map(m => (
                                    <tr key={m.id}>
                                        <td>
                                            <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{m.family_member_name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Mail size={10} /> {m.family_member_email}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge badge-gray">{m.relation}</span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13, color: 'var(--slate-600)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Clock size={14} className="text-muted" />
                                                {new Date(m.granted_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                                                <span style={{ fontSize: 13 }}>Live Sync Active</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>
                                                <Trash2 size={16} /> Revoke
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {sharedWithMe.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '100px 0' }}>
                            <ShieldCheck size={48} className="text-muted" style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                            <h3 style={{ fontSize: 16, color: 'var(--slate-400)' }}>No Shared Records</h3>
                            <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>When a family member grants you access, their status will appear here.</p>
                        </div>
                    ) : sharedWithMe.map(p => (
                        <div key={p.patient_email} className="card">
                            <div className="card-header" style={{ background: 'var(--slate-50)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--navy-600)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                                        {p.patient_name[0]}
                                    </div>
                                    <div>
                                        <div className="card-title">{p.patient_name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{p.relation} · {p.age} yrs · {p.blood_group}</div>
                                    </div>
                                </div>
                                <div className="badge badge-teal">Access Verified</div>
                            </div>
                            <div className="card-body">
                                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Medical Events</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {p.records.length === 0 ? (
                                        <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>No clinical records available for this patient.</p>
                                    ) : p.records.map((r, i) => (
                                        <div key={i} style={{ padding: 16, border: '1px solid var(--slate-100)', borderRadius: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                                <span style={{ fontSize: 12, fontWeight: 700 }}>{new Date(r.date).toLocaleDateString()}</span>
                                                <span style={{ fontSize: 11, color: 'var(--navy-600)', fontWeight: 600 }}>Reviewed by Dr. {r.doctor}</span>
                                            </div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 4 }}>{r.diagnosis}</div>
                                            <div style={{ fontSize: 12, color: 'var(--slate-600)' }}>Prescription: {r.prescription}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Invite Modal */}
            {showAdd && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <div className="modal-title">Grant Family Access</div>
                            <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
                        </div>
                        <form onSubmit={handleInvite}>
                            <div className="modal-body">
                                <div className="alert alert-info" style={{ marginBottom: 20 }}>
                                    <span>Providing access allows this person to view your medical history, current queue position, and billing details.</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input
                                        className="form-input"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input
                                        className="form-input"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="family@example.com"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Relationship</label>
                                    <select
                                        className="form-select"
                                        required
                                        value={formData.relation}
                                        onChange={e => setFormData({ ...formData, relation: e.target.value })}
                                    >
                                        <option value="">Select relation...</option>
                                        <option value="Spouse">Spouse</option>
                                        <option value="Parent">Parent</option>
                                        <option value="Sibling">Sibling</option>
                                        <option value="Child">Child</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Confirm & Sync</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
