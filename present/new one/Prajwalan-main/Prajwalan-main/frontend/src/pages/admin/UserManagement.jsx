import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Users, Search, Filter, MoreVertical,
    UserCheck, UserX, Mail, Phone, Calendar,
    Shield, User as UserIcon, Truck, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ role: '', search: '' });
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

    useEffect(() => {
        loadUsers();
    }, [filter.role]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/users', { params: { role: filter.role } });
            setUsers(res.data.users);

            // Derive stats from the full list for now, or could have a separate endpoint
            const total = res.data.total;
            const active = res.data.users.filter(u => u.is_active).length;
            setStats({ total, active, inactive: total - active });
        } catch (e) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            await api.patch(`/admin/users/${id}/toggle`);
            setUsers(users.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u));
            toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
        } catch (e) {
            toast.error('Operation failed');
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'admin': return <Shield size={16} className="text-danger" />;
            case 'doctor': return <Activity size={16} className="text-teal" />;
            case 'driver': return <Truck size={16} className="text-orange" />;
            default: return <UserIcon size={16} className="text-navy" />;
        }
    };

    const filteredUsers = users.filter(u =>
        u.full_name.toLowerCase().includes(filter.search.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.search.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="section-title">User Management</h2>
                    <p className="section-sub">Directory of all registered patients and hospital staff</p>
                </div>
                <div className="flex gap-4">
                    <div className="stat-label">Total: <strong>{stats.total}</strong></div>
                    <div className="stat-label">Active: <strong className="text-success">{stats.active}</strong></div>
                </div>
            </div>

            <div className="card mb-6">
                <div className="card-body flex gap-4 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            className="form-control pl-10"
                            placeholder="Search by name or email..."
                            value={filter.search}
                            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-slate-500" />
                        <select
                            className="form-control"
                            value={filter.role}
                            onChange={(e) => setFilter({ ...filter, role: e.target.value })}
                        >
                            <option value="">All Roles</option>
                            <option value="patient">Patients</option>
                            <option value="doctor">Doctors</option>
                            <option value="driver">Drivers</option>
                            <option value="admin">Admins</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-body p-0">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Contact</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Joined</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-20">
                                            <div className="spinner mx-auto mb-4" />
                                            <p className="text-muted">Fetching user records...</p>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-20">
                                            <Users size={48} className="mx-auto text-slate-200 mb-4" />
                                            <p className="text-muted">No users found matching your criteria</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(u => (
                                        <tr key={u.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="avatar-sm">
                                                        {u.full_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{u.full_name}</div>
                                                        <div className="text-xs text-slate-500 uppercase">{u.id.substring(0, 8)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Mail size={12} className="text-slate-400" /> {u.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Phone size={12} className="text-slate-400" /> {u.mobile}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 uppercase text-xs font-bold tracking-wider">
                                                    {getRoleIcon(u.role)}
                                                    {u.role}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                                                    {u.is_active ? 'Active' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="text-sm text-slate-600">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="text-right">
                                                <button
                                                    onClick={() => toggleStatus(u.id, u.is_active)}
                                                    className={`btn btn-sm ${u.is_active ? 'btn-ghost text-danger' : 'btn-ghost text-success'}`}
                                                    title={u.is_active ? 'Deactivate' : 'Activate'}
                                                >
                                                    {u.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
