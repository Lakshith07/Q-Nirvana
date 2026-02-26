import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Droplet, Search, Filter, AlertTriangle,
    ArrowUpRight, Info, Heart, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function BloodBank() {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadStock();
    }, []);

    const loadStock = async () => {
        setLoading(true);
        try {
            const res = await api.get('/patient/blood-bank');
            setStock(res.data.bloodBank || []);
        } catch (e) {
            toast.error('Failed to load blood bank data');
        } finally {
            setLoading(false);
        }
    };

    const filtered = stock.filter(s =>
        s.blood_group.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="page-loader">
                <div className="spinner spinner-dark" />
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h2 className="section-title">Blood Bank Inventory</h2>
                <p className="section-sub">Real-time blood availability across all hospital departments</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
                <div>
                    {/* Search and Filters */}
                    <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div className="input-group" style={{ flex: 1 }}>
                                <Search className="input-icon-left" size={16} />
                                <input
                                    className="form-input"
                                    placeholder="Search blood group (e.g. O+, AB-)..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <button className="btn btn-outline">
                                <Filter size={16} /> Filter
                            </button>
                        </div>
                    </div>

                    {/* Stock Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                        {filtered.map(item => {
                            const isLow = item.units_available < 10;
                            const isCritical = item.units_available < 5;

                            return (
                                <div key={item.blood_group} className="card" style={{
                                    borderTop: `4px solid ${isCritical ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)'}`,
                                    transition: 'transform 0.2s',
                                    cursor: 'default'
                                }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = ''}
                                >
                                    <div className="card-body" style={{ padding: 24 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                            <div className={`bg-blood ${isCritical ? 'critical' : isLow ? 'low' : 'normal'}`} style={{ width: 44, height: 44, fontSize: 16 }}>
                                                {item.blood_group}
                                            </div>
                                            <div className={`badge badge-${isCritical ? 'red' : isLow ? 'yellow' : 'green'}`} style={{ fontSize: 10 }}>
                                                {isCritical ? 'CRITICAL' : isLow ? 'LOW STOCK' : 'AVAILABLE'}
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--slate-900)', lineHeight: 1 }}>
                                                {item.units_available}
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 4 }}>Units Available</div>
                                        </div>

                                        <div className="progress-bar" style={{ height: 6, marginBottom: 16 }}>
                                            <div className={`progress-fill ${item.units_available < 15 ? 'danger' : 'success'}`}
                                                style={{ width: `${Math.min((item.units_available / 50) * 100, 100)}%` }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Last updated 2h ago</span>
                                            <button className="btn btn-ghost btn-sm" style={{ padding: 0, color: 'var(--navy-600)' }}>
                                                History <ArrowUpRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Sidebar: Info & Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="card" style={{ background: 'var(--navy-900)', color: 'white', border: 'none' }}>
                        <div className="card-body" style={{ padding: 28 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                <Heart size={24} color="var(--teal-400)" fill="var(--teal-400)" />
                            </div>
                            <h3 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Need Blood Urgently?</h3>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                                If you require an immediate transfusion for a registered patient, please submit a formal request or visit the emergency wing.
                            </p>
                            <button className="btn btn-teal w-full btn-lg">Request Blood Unit</button>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header"><div className="card-title">Blood Banking FAQS</div></div>
                        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flexShrink: 0, marginTop: 3 }}><Info size={16} color="var(--navy-500)" /></div>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>How to donate?</p>
                                    <p style={{ fontSize: 12, color: 'var(--slate-500)', lineHeight: 1.5 }}>Visit our donation center on Floor 2, Block B between 9 AM - 5 PM.</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flexShrink: 0, marginTop: 3 }}><CheckCircle2 size={16} color="var(--success)" /></div>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Verification</p>
                                    <p style={{ fontSize: 12, color: 'var(--slate-500)', lineHeight: 1.5 }}>All blood units are NAAT tested and storage monitored 24/7.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="alert alert-warning">
                        <AlertTriangle size={18} />
                        <div>
                            <p style={{ fontWeight: 700, marginBottom: 4 }}>O- Negative Shortage</p>
                            <p style={{ fontSize: 12 }}>We are currently running low on O- units. Universal donors are encouraged to donate today.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
