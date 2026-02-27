import { useState, useEffect } from 'react';
import { MapPin, Info, ArrowRight, Layers, Activity } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function HospitalBlueprint() {
    const [activeFloor, setActiveFloor] = useState(1);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [beds, setBeds] = useState([]);
    const [loading, setLoading] = useState(false);

    const FLOORS = [
        { id: 3, label: 'Floor 3', units: ['Maternity Wing', 'Pediatrics', 'Neonatal ICU'] },
        { id: 2, label: 'Floor 2', units: ['Surgery Dept', 'ICU - Cluster A', 'Blood Bank'] },
        { id: 1, label: 'Floor 1', units: ['OPD Registration', 'Main Laboratory', 'Emergency / Trauma'] },
        { id: 0, label: 'Ground', units: ['Pharmacy', 'Cafeteria', 'Ambulance Bay'] }
    ];

    useEffect(() => {
        const fetchBeds = async () => {
            setLoading(true);
            try {
                const res = await api.get('/patient/beds');
                setBeds(res.data.summary || []);
            } catch (err) {
                console.error('Failed to fetch floor data');
            } finally {
                setLoading(false);
            }
        };
        fetchBeds();
    }, []);

    const ROOMS = {
        1: [
            { id: 'R101', name: 'General Ward', x: 50, y: 50, w: 100, h: 80, info: 'Standard patient monitoring and recovery wing.', ward: 'General Ward' },
            { id: 'R102', name: 'Lab Cluster', x: 200, y: 50, w: 80, h: 80, info: 'Diagnostic services and blood sampling.', ward: 'Laboratory' },
            { id: 'E1', name: 'Triage Room', x: 50, y: 180, w: 230, h: 100, info: 'Initial assessment for emergency cases.', critical: true, ward: 'Emergency' },
        ],
        2: [
            { id: 'S201', name: 'ICU-1', x: 50, y: 50, w: 120, h: 100, info: 'Intensive care unit with ventilator support.', critical: true, ward: 'ICU' },
            { id: 'S202', name: 'Post-Op', x: 200, y: 50, w: 200, h: 100, info: 'Surgical recovery and observation.', ward: 'Surgery' },
        ]
    };

    const getWardStats = (wardName) => {
        const stats = beds.find(b => b.bed_type.toLowerCase() === (wardName || '').toLowerCase());
        return stats || { available: 0, total: 0 };
    };

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h2 className="section-title">Hospital Blueprint</h2>
                <p className="section-sub">Interactive facility map & real-time floor monitoring</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 300px', gap: 24, height: 'calc(100vh - 200px)', alignItems: 'stretch' }}>
                {/* Floor Selector */}
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ padding: '0 8px 16px', borderBottom: '1px solid var(--slate-100)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Layers size={18} className="text-navy" />
                        <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>Navigation</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {FLOORS.map(f => (
                            <button
                                key={f.id}
                                onClick={() => { setActiveFloor(f.id); setSelectedRoom(null); }}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: 10,
                                    border: '1px solid',
                                    borderColor: activeFloor === f.id ? 'var(--navy-500)' : 'var(--slate-200)',
                                    background: activeFloor === f.id ? 'var(--navy-50)' : 'white',
                                    color: activeFloor === f.id ? 'var(--navy-900)' : 'var(--slate-600)',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <span style={{ fontWeight: activeFloor === f.id ? 700 : 500 }}>{f.label}</span>
                                {activeFloor === f.id && <ArrowRight size={14} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Map Area */}
                {/* Map Area */}
                <div className="card" style={{ position: 'relative', overflow: 'hidden', background: '#f1f5f9' }}>
                    <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, background: 'rgba(255,255,255,0.8)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1px solid var(--slate-200)' }}>
                        Currently Viewing: {FLOORS.find(f => f.id === activeFloor)?.label}
                    </div>

                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                        <svg width="600" height="400" viewBox="0 0 600 400" style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))' }}>
                            {/* Building Outline */}
                            <rect x="20" y="20" width="560" height="360" rx="12" fill="white" stroke="var(--slate-300)" strokeWidth="4" />

                            {/* Rooms for active floor */}
                            {(ROOMS[activeFloor] || []).map(room => (
                                <g key={room.id}
                                    onClick={() => setSelectedRoom(room)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <rect
                                        x={room.x} y={room.y} width={room.w} height={room.h}
                                        rx="6"
                                        fill={selectedRoom?.id === room.id ? 'var(--navy-100)' : room.critical ? 'var(--danger-light)' : 'var(--slate-50)'}
                                        stroke={selectedRoom?.id === room.id ? 'var(--navy-500)' : room.critical ? 'var(--danger)' : 'var(--slate-300)'}
                                        strokeWidth="2"
                                        style={{ transition: 'all 0.3s' }}
                                    />
                                    <text
                                        x={room.x + room.w / 2} y={room.y + room.h / 2}
                                        textAnchor="middle"
                                        alignmentBaseline="middle"
                                        style={{ fontSize: 11, fontWeight: 700, fill: room.critical ? 'var(--danger)' : 'var(--slate-600)', pointerEvents: 'none' }}
                                    >
                                        {room.name}
                                    </text>
                                </g>
                            ))}

                            {/* Corridors */}
                            <path d="M 50 150 L 550 150" stroke="var(--slate-200)" strokeWidth="15" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>

                {/* Details Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card" style={{ flex: 1 }}>
                        <div className="card-header"><div className="card-title">Zone Details</div></div>
                        <div className="card-body">
                            {selectedRoom ? (
                                <div className="animate-fade-in">
                                    <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-900)', marginBottom: 8 }}>{selectedRoom.name}</h4>
                                    <div className="badge badge-blue" style={{ marginBottom: 16 }}>ID: {selectedRoom.id}</div>
                                    <p style={{ fontSize: 14, color: 'var(--slate-600)', lineHeight: 1.6 }}>{selectedRoom.info}</p>

                                    <div style={{ marginTop: 24, padding: 16, background: 'var(--slate-50)', borderRadius: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--navy-600)', marginBottom: 12 }}>
                                            <Info size={16} />
                                            <span style={{ fontWeight: 700, fontSize: 12 }}>Live Ward Status</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>Capacity: {getWardStats(selectedRoom.ward).total || 12} beds</div>
                                            <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: 14 }}>{getWardStats(selectedRoom.ward).available || 4} Available</div>
                                        </div>
                                        <div className="progress-bar" style={{ marginTop: 8, height: 4 }}>
                                            <div className="progress-fill" style={{ width: `${(getWardStats(selectedRoom.ward).available / getWardStats(selectedRoom.ward).total) * 100 || 60}%` }} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--slate-400)' }}>
                                    <MapPin size={40} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                    <p style={{ fontSize: 14 }}>Select a room on the map to view floor details.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card bg-navy-900 text-white">
                        <div className="card-body">
                            <h4 style={{ color: 'white', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Activity size={16} className="text-teal" /> Floor Overview
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {FLOORS.find(f => f.id === activeFloor)?.units.map(unit => (
                                    <div key={unit} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal-400)' }} />
                                        {unit}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
