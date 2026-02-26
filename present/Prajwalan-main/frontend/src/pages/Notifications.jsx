import { Bell, Info } from 'lucide-react';

export default function NotificationsPage() {
    return (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{
                width: 80, height: 80, borderRadius: '50%', background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
            }}>
                <Bell size={40} color="var(--navy-600)" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Notifications</h2>
            <p style={{ color: 'var(--slate-500)', maxWidth: 460, margin: '0 auto 24px' }}>
                You have no new notifications at this time. We will notify you about appointments, emergencies, and system updates here.
            </p>
            <div className="alert alert-info" style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>
                <Info size={16} />
                <span>Real-time alerts are currently active and monitored.</span>
            </div>
        </div>
    );
}
