import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Search, Menu, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageHeader({ title, subtitle, actions, onMenuClick }) {
    const { user } = useAuth();
    const [darkMode, setDarkMode] = useState(false);

    const root = user?.role ? `/${user.role}` : '/login';

    return (
        <header className="page-header">
            <div className="flex items-center gap-3">
                {/* Mobile menu */}
                <button
                    className="btn btn-ghost btn-sm mobile-only"
                    style={{ padding: '8px' }}
                    id="sidebar-mobile-toggle"
                    onClick={onMenuClick}
                >
                    <Menu size={20} />
                </button>

                <div>
                    {title && (
                        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>{title}</h1>
                    )}
                    {subtitle && (
                        <p style={{ fontSize: '13px', color: 'var(--slate-500)', margin: 0 }}>{subtitle}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {actions}

                <Link to={`${root}/notifications`} className="btn btn-ghost btn-sm" style={{ padding: '8px', position: 'relative' }}>
                    <Bell size={18} />
                    <span style={{
                        position: 'absolute', top: 4, right: 4, width: 8, height: 8,
                        background: 'var(--danger)', borderRadius: '50%', border: '2px solid white'
                    }} />
                </Link>

                <Link to={`${root}/profile`} className="flex items-center gap-2" style={{
                    padding: '6px 12px',
                    background: 'var(--slate-100)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--slate-700)',
                    gap: '8px',
                    textDecoration: 'none'
                }}>
                    <div className="avatar avatar-sm" style={{ fontSize: '11px' }}>
                        {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.full_name}
                    </span>
                </Link>
            </div>
        </header>
    );
}
