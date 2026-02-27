import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import PageHeader from './PageHeader';

export default function DashboardLayout({ title, subtitle, actions }) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="app-shell">
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }}
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

            <div className="main-content">
                <PageHeader
                    title={title}
                    subtitle={subtitle}
                    actions={actions}
                    onMenuClick={() => setMobileOpen(true)}
                />
                <div className="page-body">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
