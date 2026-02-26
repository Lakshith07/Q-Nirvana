import { Settings as SettingsIcon, User, Bell, Shield, Moon } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h2 className="section-title">Account Settings</h2>
                <p className="section-sub">Manage your profile, security, and notification preferences</p>
            </div>

            <div style={{ display: 'grid', gap: 24 }}>
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">General Preferences</div>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Moon size={18} color="var(--slate-600)" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Dark Mode</div>
                                        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Switch to the dark side of the interface</div>
                                    </div>
                                </div>
                                <div className="spinner-small" style={{ border: '2px solid var(--slate-200)', borderTopColor: 'var(--navy-600)', borderRadius: '50%', width: 24, height: 24 }}></div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Bell size={18} color="var(--slate-600)" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Push Notifications</div>
                                        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Get instant alerts on your desktop</div>
                                    </div>
                                </div>
                                <div style={{ width: 40, height: 20, background: 'var(--navy-600)', borderRadius: 20, position: 'relative' }}>
                                    <div style={{ width: 14, height: 14, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, right: 3 }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Security</div>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Shield size={20} color="var(--danger)" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700 }}>Two-Factor Authentication</div>
                                <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>Add an extra layer of security to your hospital account</div>
                            </div>
                            <button className="btn btn-outline btn-sm">Enable</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
