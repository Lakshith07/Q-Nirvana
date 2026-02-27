import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Shield, Calendar, MapPin, Briefcase, Award } from 'lucide-react';

export default function ProfilePage() {
    const { user } = useAuth();

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ marginBottom: 28 }}>
                <h2 className="section-title">My Profile</h2>
                <p className="section-sub">Manage your personal information and hospital identity</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
                {/* Left Col: Avatar & Role */}
                <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
                    <div className="avatar" style={{ width: 100, height: 100, fontSize: 32, margin: '0 auto 20px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                        {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>{user?.full_name}</h3>
                    <div className="badge badge-blue" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 12px' }}>
                        {user?.role}
                    </div>
                    <div className="divider" style={{ margin: '24px 0' }} />
                    <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: 'var(--slate-600)', fontSize: 13 }}>
                            <Mail size={16} /> {user?.email}
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: 'var(--slate-600)', fontSize: 13 }}>
                            <Phone size={16} /> {user?.mobile || 'Not provided'}
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: 'var(--slate-600)', fontSize: 13 }}>
                            <Shield size={16} /> Verified Account
                        </div>
                    </div>
                </div>

                {/* Right Col: Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Identity Details</div>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div>
                                    <label className="form-label">System ID</label>
                                    <div style={{ fontSize: 13, color: 'var(--slate-500)', fontFamily: 'monospace', background: '#f8fafc', padding: '8px 12px', borderRadius: 6 }}>
                                        {user?.id?.substring(0, 18)}...
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Account Created</label>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                                        {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Hospital Records Metadata</div>
                        </div>
                        <div className="card-body">
                            <div style={{ color: 'var(--slate-500)', fontSize: 14, lineHeight: 1.6 }}>
                                <p>This account is linked to the <strong>Q Nirvana Cloud Ledger</strong>. All medical transactions, prescriptions, and emergencies associated with this profile are encrypted and stored in our production database.</p>
                                <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>Download Digital Identity</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
