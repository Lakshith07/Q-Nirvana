import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    FileText, Shield, Search, Filter,
    Calendar, Clock, User, ArrowRight,
    Activity, LogIn, Database, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/audit-logs');
            setLogs(res.data.logs || []);
        } catch (e) {
            toast.error('Failed to load system logs');
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action) => {
        if (action.includes('LOGIN')) return <LogIn size={14} className="text-blue-500" />;
        if (action.includes('USER')) return <User size={14} className="text-teal-500" />;
        if (action.includes('BED')) return <Database size={14} className="text-purple-500" />;
        if (action.includes('EMERGENCY')) return <Activity size={14} className="text-danger" />;
        if (action.includes('CONFIG')) return <Settings size={14} className="text-slate-500" />;
        return <FileText size={14} className="text-slate-400" />;
    };

    const filteredLogs = logs.filter(l =>
        l.action_type.toLowerCase().includes(filter.toLowerCase()) ||
        l.admin_name?.toLowerCase().includes(filter.toLowerCase()) ||
        l.details?.toString().toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="section-title">System Audit Trail</h2>
                    <p className="section-sub">Immutable ledger of all administrative actions and security events</p>
                </div>
                <div className="flex gap-4">
                    <div className="stat-label">Security Protocol: <strong className="text-success">ACTIVE</strong></div>
                    <button className="btn btn-outline btn-sm" onClick={loadLogs}>Refresh</button>
                </div>
            </div>

            <div className="card mb-6">
                <div className="card-body">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            className="form-control pl-10"
                            placeholder="Filter by action, user, or keyword..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-body p-0">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Actor</th>
                                    <th>Action</th>
                                    <th>Meta Details</th>
                                    <th>IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array(8).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan="5"><div className="h-10 bg-slate-50 rounded" /></td>
                                        </tr>
                                    ))
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-20">
                                            <Shield size={48} className="mx-auto text-slate-200 mb-4" />
                                            <p className="text-muted">No audit records found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50/50">
                                            <td className="whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">{new Date(log.created_at).toLocaleDateString()}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                                                        {log.admin_name?.charAt(0) || 'S'}
                                                    </div>
                                                    <span className="text-sm font-semibold">{log.admin_name || 'System'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 px-2 py-1 rounded bg-slate-100 w-fit">
                                                    {getActionIcon(log.action_type)}
                                                    <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">{log.action_type}</span>
                                                </div>
                                            </td>
                                            <td className="max-w-xs">
                                                <p className="text-xs text-slate-500 truncate" title={JSON.stringify(log.details)}>
                                                    {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                                                </p>
                                            </td>
                                            <td className="font-mono text-[10px] text-slate-400">
                                                {log.ip_address || '127.0.0.1'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="card-footer bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">End of Log Stream</p>
                    <button className="btn btn-ghost btn-sm text-[10px] font-bold text-navy">EXPORT PDF</button>
                </div>
            </div>
        </div>
    );
}
