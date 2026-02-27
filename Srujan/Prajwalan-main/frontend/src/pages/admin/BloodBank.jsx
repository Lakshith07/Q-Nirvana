import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Droplet, Plus, Search, CheckCircle,
    AlertTriangle, History, ArrowRight,
    TrendingDown, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminBloodBank() {
    const [stock, setStock] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/blood-bank');
            setStock(res.data.stock || []);
            setRequests(res.data.pending_requests || []);
        } catch (e) {
            toast.error('Failed to sync blood inventory');
        } finally {
            setLoading(false);
        }
    };

    const updateStock = async (bloodGroup, units) => {
        try {
            await api.patch(`/admin/blood-bank/${bloodGroup}`, { units_available: units });
            toast.success(`Stock updated for ${bloodGroup}`);
            loadData();
        } catch (e) {
            toast.error('Update failed');
        }
    };

    const handleRequest = async (id, status) => {
        try {
            await api.patch(`/admin/blood-requests/${id}`, { status });
            toast.success(`Request ${status}`);
            loadData();
        } catch (e) {
            toast.error(`Failed to ${status} request`);
        }
    };

    if (loading && stock.length === 0) return <div className="page-loader"><div className="spinner spinner-dark" /></div>;

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h2 className="section-title">Blood Inventory & Requests</h2>
                <p className="section-sub">Manage critical blood stock levels and approve departmental transfusion requests</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, alignItems: 'start' }}>
                {/* Inventory Adjustment */}
                <div className="card">
                    <div className="card-header"><div className="card-title">Stock Levels</div></div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Blood Group</th>
                                        <th>Current Stock</th>
                                        <th>Threshold</th>
                                        <th style={{ width: 220 }}>Quick Adjust</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stock.map(s => {
                                        const isCritical = s.units_available < 10;
                                        return (
                                            <tr key={s.blood_group}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div className={`bg-blood ${isCritical ? 'critical' : 'normal'}`} style={{ width: 32, height: 32, fontSize: 13 }}>{s.blood_group}</div>
                                                        <span style={{ fontWeight: 700 }}>{s.blood_group}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 800, color: isCritical ? 'var(--danger)' : 'var(--slate-900)', fontSize: 18 }}>
                                                        {s.units_available} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--slate-400)' }}>Units</span>
                                                    </div>
                                                </td>
                                                <td>15 Units</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <input
                                                            type="number"
                                                            className="form-input btn-sm"
                                                            style={{ width: 80 }}
                                                            defaultValue={s.units_available}
                                                            onBlur={(e) => updateStock(s.blood_group, e.target.value)}
                                                        />
                                                        <button className="btn btn-primary btn-sm" style={{ padding: 8 }}><ArrowRight size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Pending Requests */}
                <div className="card">
                    <div className="card-header" style={{ background: '#fef2f2' }}>
                        <div className="card-title" style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShieldAlert size={18} /> Transfusion Requests
                        </div>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        {requests.length === 0 ? (
                            <div style={{ padding: 48, textAlign: 'center' }}>
                                <p className="text-muted">No pending requests found.</p>
                            </div>
                        ) : (
                            requests.map((r, idx) => (
                                <div key={r.id} style={{
                                    padding: '20px',
                                    borderBottom: idx < requests.length - 1 ? '1px solid var(--slate-100)' : 'none',
                                    background: r.urgency === 'High' ? '#fff1f2' : 'transparent'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div className="badge badge-red">{r.blood_group}</div>
                                            <span style={{ fontWeight: 700, fontSize: 14 }}>{r.units_needed} Units</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--slate-400)' }}>{new Date(r.created_at).toLocaleTimeString()}</div>
                                    </div>

                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{r.patient_name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Requested by: Dr. {r.requested_by_name}</div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-primary btn-sm flex-1" onClick={() => handleRequest(r.id, 'approved')}>Approve</button>
                                        <button className="btn btn-outline btn-sm flex-1" onClick={() => handleRequest(r.id, 'rejected')}>Reject</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
