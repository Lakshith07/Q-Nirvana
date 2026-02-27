import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    BarChart3, PieChart, TrendingUp, TrendingDown,
    Calendar, Download, Filter, AreaChart as AreaIcon,
    Users, Activity, Droplets, Bed
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminReports() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('7d');

    useEffect(() => {
        loadData();
    }, [timeRange]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Reusing dashboard data or a specific reports endpoint if it existed
            const res = await api.get('/admin/dashboard');
            setStats(res.data.dashboard);
        } catch (e) {
            toast.error('Failed to generate report data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="page-loader"><div className="spinner spinner-dark" /></div>;

    const dataPoints = [
        { label: 'OPD Admissions', val: 124, trend: '+12%', up: true },
        { label: 'Emergency Response', val: '2.4m', trend: '-8s', up: true },
        { label: 'Bed Occupancy', val: '78%', trend: '+4%', up: true },
        { label: 'Staff Efficiency', val: '92%', trend: '-2%', up: false },
    ];

    return (
        <div>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="section-title">Operational Excellence Intelligence</h2>
                    <p className="section-sub">Data-driven insights and hospital performance metrics</p>
                </div>
                <div className="flex gap-3">
                    <select
                        className="form-control btn-sm"
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                    >
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="1y">Year to Date</option>
                    </select>
                    <button className="btn btn-outline btn-sm"><Download size={14} /> Export Report</button>
                </div>
            </div>

            {/* Top Scorecards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {dataPoints.map((d, i) => (
                    <div key={i} className="card bg-white border-2 hover:border-navy-200 transition-all">
                        <div className="card-body">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{d.label}</span>
                                <div className={`flex items-center gap-1 text-[10px] font-bold ${d.up ? 'text-success' : 'text-danger'}`}>
                                    {d.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {d.trend}
                                </div>
                            </div>
                            <div className="text-3xl font-extrabold text-navy-900">{d.val}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Simulated Chart 1: Admissions Trend */}
                <div className="col-span-12 lg:col-span-8 card">
                    <div className="card-header">
                        <div className="card-title flex items-center gap-2">
                            <AreaIcon size={18} className="text-navy" />
                            Daily Admissions & Emergencies
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="h-64 flex items-end gap-2 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            {[40, 65, 30, 85, 45, 90, 55, 75, 50, 95, 60, 80].map((h, i) => (
                                <div key={i} className="flex-1 group relative">
                                    <div className="bg-navy-400 rounded-t-sm w-full transition-all group-hover:bg-navy-600" style={{ height: `${h}%` }}>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-navy-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            {h} Cases
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-slate-400 mt-2 text-center">{i + 1} PM</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Simulated Chart 2: Resource Allocation */}
                <div className="col-span-12 lg:col-span-4 card">
                    <div className="card-header">
                        <div className="card-title flex items-center gap-2">
                            <PieChart size={18} className="text-teal" />
                            Resource Split
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="flex flex-col gap-6">
                            {[
                                { label: 'OPD Consultations', val: 45, color: 'bg-navy-500' },
                                { label: 'Emergency Services', val: 25, color: 'bg-danger' },
                                { label: 'In-patient Care', val: 20, color: 'bg-teal-500' },
                                { label: 'Administrative', val: 10, color: 'bg-slate-400' },
                            ].map((item, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span>{item.label}</span>
                                        <span>{item.val}%</span>
                                    </div>
                                    <div className="progress-bar"><div className={`progress-fill ${item.color}`} style={{ width: `${item.val}%` }} /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Patient Demographics Feed */}
                <div className="col-span-12 card">
                    <div className="card-header"><div className="card-title">Detailed Performance Breakdown</div></div>
                    <div className="card-body p-0">
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Department</th>
                                        <th>Average Wait Time</th>
                                        <th>Satisfaction</th>
                                        <th>Utilization</th>
                                        <th>Revenue (SIM)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { dep: 'Cardiology', wait: '12m', sat: '4.8/5', util: '92%', rev: '₹145K' },
                                        { dep: 'Orthopedics', wait: '28m', sat: '4.2/5', util: '85%', rev: '₹98K' },
                                        { dep: 'Pediatrics', wait: '15m', sat: '4.9/5', util: '70%', rev: '₹64K' },
                                        { dep: 'Neurology', wait: '32m', sat: '4.5/5', util: '88%', rev: '₹210K' },
                                    ].map((d, i) => (
                                        <tr key={i}>
                                            <td className="font-bold">{d.dep}</td>
                                            <td>{d.wait}</td>
                                            <td><div className="flex items-center gap-1 text-sm">{d.sat} <Star size={10} className="fill-yellow-400 text-yellow-500" /></div></td>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono">{d.util}</span>
                                                    <div className="progress-bar w-20"><div className="progress-fill" style={{ width: d.util }} /></div>
                                                </div>
                                            </td>
                                            <td className="font-bold text-navy">{d.rev}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Star({ size, className }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
}
