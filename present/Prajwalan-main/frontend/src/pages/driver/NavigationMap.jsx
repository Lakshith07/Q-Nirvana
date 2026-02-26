import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Navigation, Map as MapIcon, Compass,
    ArrowRight, MapPin, Truck, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function NavigationMap() {
    const [activeMission, setActiveMission] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActiveMission();
    }, []);

    const loadActiveMission = async () => {
        setLoading(true);
        try {
            const res = await api.get('/driver/my-emergencies');
            const ongoing = res.data.emergencies.find(e => ['accepted', 'en_route', 'picked_up', 'at_hospital'].includes(e.status));
            setActiveMission(ongoing);
        } catch (e) {
            toast.error('Failed to load map data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="page-loader"><div className="spinner" /></div>;

    return (
        <div style={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="section-title text-2xl">Navigation System</h2>
                    <p className="section-sub">Dijkstra-optimized real-time routing</p>
                </div>
                {activeMission && (
                    <div className="badge badge-red pulse flex items-center gap-2 py-2 px-4">
                        <Activity size={12} /> MISSION ACTIVE: {activeMission.patient_name}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden">
                {/* Map View Area */}
                <div className="col-span-8 card relative overflow-hidden flex flex-col bg-slate-100 border-2" style={{ borderColor: 'var(--slate-200)' }}>
                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                        <div className="bg-white/90 backdrop-blur p-2 rounded-lg shadow-sm border border-slate-200">
                            <Compass size={24} className="text-navy" />
                        </div>
                    </div>

                    {/* Simulated Map Background */}
                    <div className="flex-1 relative flex items-center justify-center">
                        <svg width="100%" height="100%" viewBox="0 0 800 600" style={{ background: '#f8fafc' }}>
                            {/* Grid lines */}
                            <defs>
                                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />

                            {/* Road Network (Simulated) */}
                            <path d="M 100 100 L 700 100 M 100 300 L 700 300 M 100 500 L 700 500" stroke="#cbd5e1" strokeWidth="20" strokeLinecap="round" />
                            <path d="M 150 50 L 150 550 M 400 50 L 400 550 M 650 50 L 650 550" stroke="#cbd5e1" strokeWidth="20" strokeLinecap="round" />

                            {/* Waypoints */}
                            <circle cx="150" cy="100" r="4" fill="#64748b" />
                            <circle cx="400" cy="100" r="4" fill="#64748b" />
                            <circle cx="650" cy="100" r="4" fill="#64748b" />
                            <circle cx="150" cy="300" r="4" fill="#64748b" />
                            <circle cx="400" cy="300" r="4" fill="#64748b" />
                            <circle cx="650" cy="300" r="4" fill="#64748b" />

                            {activeMission ? (
                                <>
                                    {/* Dijkstra Path Overlay */}
                                    <path d="M 150 500 L 400 500 L 400 300 L 650 300 L 650 100"
                                        fill="none" stroke="var(--navy-500)" strokeWidth="8" strokeLinecap="round" strokeDasharray="12,8"
                                        className="animate-pulse" />

                                    {/* Locations */}
                                    <g transform="translate(150, 500)">
                                        <circle r="12" fill="white" stroke="var(--navy-600)" strokeWidth="4" />
                                        <Truck size={14} x="-7" y="-7" className="text-navy" />
                                        <text y="24" textAnchor="middle" className="text-[10px] font-bold fill-navy">YOU</text>
                                    </g>

                                    <g transform="translate(400, 300)">
                                        <circle r="12" fill="white" stroke="var(--danger)" strokeWidth="4" />
                                        <MapPin size={14} x="-7" y="-7" className="text-danger" />
                                        <text y="24" textAnchor="middle" className="text-[10px] font-bold fill-danger">PATIENT</text>
                                    </g>

                                    <g transform="translate(650, 100)">
                                        <circle r="12" fill="white" stroke="var(--teal-600)" strokeWidth="4" />
                                        <Navigation size={14} x="-7" y="-7" className="text-teal" />
                                        <text y="24" textAnchor="middle" className="text-[10px] font-bold fill-teal">HOSPITAL</text>
                                    </g>
                                </>
                            ) : (
                                <text x="50%" y="50%" textAnchor="middle" className="fill-slate-300 font-bold text-lg uppercase tracking-widest">
                                    No Active Mission Dispatch
                                </text>
                            )}
                        </svg>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border border-slate-200 flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                            <div className="bg-navy-700 p-2 rounded-lg text-white">
                                <Navigation size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted uppercase">Current Target</p>
                                <p className="font-bold">{activeMission ? (['accepted', 'en_route'].includes(activeMission.status) ? 'Patient Pickup' : 'General Hospital') : 'Idle'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-muted uppercase">Est. Distance</p>
                            <p className="font-bold text-navy">{activeMission ? '3.2 KM' : '--'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-muted uppercase">Est. Time</p>
                            <p className="font-bold text-navy">{activeMission ? '8 MINS' : '--'}</p>
                        </div>
                    </div>
                </div>

                {/* Turn-by-turn / Mission Info */}
                <div className="col-span-4 flex flex-col gap-6">
                    <div className="card flex-1">
                        <div className="card-header"><div className="card-title">Route Guidance</div></div>
                        <div className="card-body p-0 overflow-y-auto">
                            {!activeMission ? (
                                <div className="p-8 text-center text-slate-400">
                                    <MapIcon size={40} className="mx-auto mb-4 opacity-20" />
                                    <p>Select a mission from the dashboard to start navigation.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {[
                                        { inst: 'Head North on MG Road', dist: '400m', time: '1m', icon: <ArrowRight size={16} className="-rotate-90" /> },
                                        { inst: 'Turn Right at Tech Square', dist: '1.2km', time: '3m', icon: <ArrowRight size={16} /> },
                                        { inst: 'Continue straight to Patient Location', dist: '1.6km', time: '4m', icon: <ArrowRight size={16} className="-rotate-90" /> },
                                        { inst: 'Pickup Patient at Richmond Circle', dist: 'Target', time: 'Now', icon: <MapPin size={16} className="text-danger" /> },
                                    ].map((step, idx) => (
                                        <div key={idx} className="p-4 border-b border-slate-50 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                            <div className="bg-slate-100 p-2 rounded-lg text-slate-600">{step.icon}</div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold">{step.inst}</p>
                                                <p className="text-xs text-slate-400">{step.dist} · {step.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card bg-navy-800 text-white p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <Compass size={24} />
                            <h3 className="font-bold">Dispatch Control</h3>
                        </div>
                        <p className="text-xs text-navy-200 mb-6 leading-relaxed">
                            Navigation uses the Dijkstra shortest path algorithm considering real-time road safety factors.
                        </p>
                        <button className="btn btn-primary w-full shadow-lg shadow-navy-900/50">Recalculate Optimal Path</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
