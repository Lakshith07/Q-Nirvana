import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Calendar, Bed, Droplets, FileText, Users,
    Activity, Truck, Settings, LogOut, Bell, ShieldAlert,
    Stethoscope, ClipboardList, UserCheck, BarChart3, Heart
} from 'lucide-react';

const NAV_CONFIG = {
    patient: [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/patient' },
        { label: 'Book OPD', icon: Calendar, path: '/patient/book-opd' },
        { label: 'My Queue', icon: Activity, path: '/patient/queue' },
        { label: 'Beds & Rooms', icon: Bed, path: '/patient/beds' },
        { label: 'Blood Bank', icon: Droplets, path: '/patient/blood-bank' },
        { label: 'Medical History', icon: FileText, path: '/patient/history' },
        { label: 'Family Access', icon: Users, path: '/patient/family' },
        { label: 'Emergency', icon: ShieldAlert, path: '/patient/emergency' },
    ],
    doctor: [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/doctor' },
        { label: 'Patient Queue', icon: ClipboardList, path: '/doctor/queue' },
        { label: 'Consultation', icon: Stethoscope, path: '/doctor/consultation' },
        { label: 'My Patients', icon: UserCheck, path: '/doctor/patients' },
        { label: 'Schedule', icon: Calendar, path: '/doctor/schedule' },
    ],
    admin: [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
        { label: 'Users', icon: Users, path: '/admin/users' },
        { label: 'Doctors', icon: Stethoscope, path: '/admin/doctors' },
        { label: 'Beds & Rooms', icon: Bed, path: '/admin/beds' },
        { label: 'Blood Bank', icon: Droplets, path: '/admin/blood-bank' },
        { label: 'Queue Overview', icon: Activity, path: '/admin/queue' },
        { label: 'Emergencies', icon: ShieldAlert, path: '/admin/emergencies' },
        { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
        { label: 'Audit Logs', icon: FileText, path: '/admin/audit' },
    ],
    driver: [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/driver' },
        { label: 'Emergencies', icon: ShieldAlert, path: '/driver/emergencies' },
        { label: 'Route Map', icon: Truck, path: '/driver/route' },
        { label: 'My History', icon: ClipboardList, path: '/driver/history' },
    ],
};

const ROLE_COLORS = {
    patient: 'from-blue-600 to-teal-500',
    doctor: 'from-teal-600 to-blue-500',
    admin: 'from-purple-600 to-blue-500',
    driver: 'from-orange-500 to-red-500',
};

export default function Sidebar({ mobileOpen, onClose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const navItems = NAV_CONFIG[user?.role] || [];
    const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Heart size={20} color="white" />
                </div>
                <div className="sidebar-logo-text">
                    <h2>Q Nirvana</h2>
                    <span>Hospital Management</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <p className="nav-section-label">Navigation</p>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === `/${user?.role}`}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => onClose && onClose()}
                    >
                        <item.icon className="nav-icon" size={18} />
                        {item.label}
                        {item.badge && <span className="nav-badge">{item.badge}</span>}
                    </NavLink>
                ))}

                <p className="nav-section-label" style={{ marginTop: 16 }}>Account</p>
                <NavLink to={`/${user?.role}/notifications`} className="nav-item" onClick={onClose}>
                    <Bell className="nav-icon" size={18} />
                    Notifications
                </NavLink>
                <NavLink to={`/${user?.role}/settings`} className="nav-item" onClick={onClose}>
                    <Settings className="nav-icon" size={18} />
                    Settings
                </NavLink>
            </nav>

            {/* User footer */}
            <div className="sidebar-footer">
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 12 }}>
                    <div
                        className="sidebar-user"
                        onClick={() => navigate(`/${user?.role}/profile`)}
                        style={{ cursor: 'pointer', flex: 1 }}
                    >
                        <div className="avatar">
                            {initials}
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{user?.full_name}</div>
                            <div className="sidebar-user-role">{user?.role}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
                        title="Logout"
                    >
                        <LogOut size={16} color="var(--slate-500)" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
