import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    User, Search, Filter, ChevronRight,
    FileText, Calendar, Activity, Download,
    UserCheck, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyPatients() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        setLoading(true);
        try {
            const res = await api.get('/doctor/patients'); // Placeholder endpoint, might need backend implementation
            setPatients(res.data.patients || []);
        } catch (e) {
            // Mocking for now since we don't have the endpoint
            setPatients([
                { id: 1, name: 'Rahul Sharma', last_visit: '2023-11-20', condition: 'Hypertension', visits: 4 },
                { id: 2, name: 'Anita Verma', last_visit: '2023-11-18', condition: 'General Follow-up', visits: 1 },
                { id: 3, name: 'Sanjay Gupta', last_visit: '2023-11-15', condition: 'Diabetes Type 2', visits: 12 }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h2 className="section-title">My Registered Patients</h2>
                <p className="section-sub">Comprehensive clinical history and longitudinal record of patients under your care</p>
            </div>

            <div className="grid-3" style={{ marginBottom: 32 }}>
                <div className="stat-card">
                    <div className="stat-icon blue"><UserCheck size={20} color="var(--navy-600)" /></div>
                    <div>
                        <div className="stat-label">Total Assigned</div>
                        <div className="stat-value">124</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon teal"><TrendingUp size={20} color="var(--teal-600)" /></div>
                    <div>
                        <div className="stat-label">Recurring Patients</div>
                        <div className="stat-value">62%</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><Activity size={20} color="var(--warning)" /></div>
                    <div>
                        <div className="stat-label">Active Cases</div>
                        <div className="stat-value">18</div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="input-group" style={{ maxWidth: 400 }}>
                        <Search className="input-icon-left" size={16} />
                        <input
                            className="form-input"
                            placeholder="Find by patient name or ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-outline btn-sm"><Filter size={14} /> Advanced Filter</button>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Patient Profile</th>
                                    <th>Primary Condition</th>
                                    <th>Last Consultation</th>
                                    <th>Visit Count</th>
                                    <th style={{ width: 150 }}>Options</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div className="avatar avatar-sm">{p.name[0]}</div>
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                                                    <div className="text-xs color-slate-400">ID #PAT-{p.id}024</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge badge-gray">{p.condition}</span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{new Date(p.last_visit).toLocaleDateString()}</div>
                                            <div className="text-xs color-slate-400">3 days ago</div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div className="progress-bar" style={{ width: 32, height: 4 }}>
                                                    <div className="progress-fill" style={{ width: `${Math.min(p.visits * 10, 100)}%`, background: 'var(--navy-400)' }} />
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: 700 }}>{p.visits}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="btn btn-ghost btn-sm" title="View Records"><FileText size={16} /></button>
                                                <button className="btn btn-ghost btn-sm" title="Download Stats"><Download size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
