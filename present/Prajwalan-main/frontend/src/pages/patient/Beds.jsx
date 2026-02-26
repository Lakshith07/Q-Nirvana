import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Bed, CheckCircle, Clock, AlertCircle, MapPin, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PatientBeds() {
    const [beds, setBeds] = useState([]);
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [booking, setBooking] = useState(false);
    const [selectedBed, setSelectedBed] = useState(null);
    const [assignO2, setAssignO2] = useState(false);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        loadBeds();
    }, []);

    const loadBeds = async () => {
        setLoading(true);
        try {
            const res = await api.get('/patient/beds');
            setBeds(res.data.beds || []);
            setSummary(res.data.summary || []);
        } catch (e) {
            toast.error('Failed to load bed availability');
        } finally {
            setLoading(false);
        }
    };

    const handleBook = async () => {
        if (!selectedBed) return toast.error('Please select a bed first');
        setBooking(true);
        try {
            const res = await api.post('/patient/book-bed', {
                bed_id: selectedBed.id,
                assign_o2: assignO2,
                notes: notes
            });
            toast.success(res.data.message, { duration: 5000 });
            setSelectedBed(null);
            setAssignO2(false);
            setNotes('');
            loadBeds();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Booking failed');
        } finally {
            setBooking(false);
        }
    };

    const typeColors = {
        'ICU': { bg: '#fee2e2', text: '#ef4444', icon: '⚡' },
        'General': { bg: '#dcfce7', text: '#22c55e', icon: '🛌' },
        'Ventilator': { bg: '#fef3c7', text: '#f59e0b', icon: '🫁' },
        'AC': { bg: '#e0f2fe', text: '#0ea5e9', icon: '❄️' },
        'Oxygen': { bg: '#f3e8ff', text: '#a855f7', icon: '🧪' }
    };

    const filtered = beds.filter(b =>
        b.ward_name.toLowerCase().includes(search.toLowerCase()) ||
        b.bed_type.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="page-loader"><div className="spinner spinner-dark" /></div>;

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h2 className="section-title">Inpatient & Specialized Unit Booking</h2>
                <p className="section-sub">Reserve rooms, beds, and respiratory support systems in real-time</p>
            </div>

            {/* Summary Row */}
            <div className="grid-5" style={{ marginBottom: 28 }}>
                {summary.map(s => (
                    <div key={s.bed_type} className="stat-card" style={{ padding: '16px 20px' }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 4 }}>{s.bed_type}</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy-800)' }}>{s.available}</span>
                                <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>/ {s.total} free</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
                <div>
                    <div className="card" style={{ marginBottom: 20, padding: 12 }}>
                        <div className="input-group">
                            <Search className="input-icon-left" size={16} />
                            <input
                                className="form-input"
                                placeholder="Search by ward (e.g. ICU, AC, General)..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="card">
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Ward / Room</th>
                                        <th>Type</th>
                                        <th>Floor</th>
                                        <th>Charge/Day</th>
                                        <th>Select</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(bed => (
                                        <tr key={bed.id}
                                            onClick={() => setSelectedBed(bed)}
                                            style={{ cursor: 'pointer', background: selectedBed?.id === bed.id ? 'var(--slate-50)' : 'transparent' }}>
                                            <td>
                                                <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{bed.ward_name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Room {bed.room_number} · Bed {bed.bed_number}</div>
                                            </td>
                                            <td>
                                                <span className="badge badge-gray" style={{ background: typeColors[bed.bed_type]?.bg, color: typeColors[bed.bed_type]?.text }}>
                                                    {bed.bed_type}
                                                </span>
                                            </td>
                                            <td>Floor {bed.floor_number}</td>
                                            <td style={{ fontWeight: 700 }}>₹{bed.charge_per_day}</td>
                                            <td>
                                                <div style={{
                                                    width: 20, height: 20, borderRadius: '50%',
                                                    border: `2px solid ${selectedBed?.id === bed.id ? 'var(--navy-600)' : 'var(--slate-300)'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {selectedBed?.id === bed.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--navy-600)' }} />}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {selectedBed ? (
                        <div className="card" style={{ border: '2px solid var(--navy-500)' }}>
                            <div className="card-header" style={{ background: 'var(--navy-50)', borderBottom: '1px solid var(--navy-100)' }}>
                                <div className="card-title" style={{ color: 'var(--navy-900)' }}>Confirm Reservation</div>
                            </div>
                            <div className="card-body">
                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 4 }}>SELECTED UNIT</div>
                                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--slate-900)' }}>{selectedBed.ward_name} - Bed {selectedBed.bed_number}</div>
                                    <div style={{ fontSize: 13, color: 'var(--slate-600)' }}>Room {selectedBed.room_number}, Floor {selectedBed.floor_number}</div>
                                </div>

                                <div style={{ background: 'var(--slate-50)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={assignO2}
                                            onChange={e => setAssignO2(e.target.checked)}
                                            style={{ width: 18, height: 18 }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>Assign O2 Cylinder</div>
                                            <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Reserved medical-grade oxygen support</div>
                                        </div>
                                    </label>
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase' }}>Clinical Notes / Requests</label>
                                    <textarea
                                        className="form-textarea"
                                        style={{ fontSize: 13, minHeight: 80 }}
                                        placeholder="e.g. History of asthma, wheelchair required..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, padding: '0 4px' }}>
                                    <span style={{ color: 'var(--slate-500)', fontWeight: 500 }}>Daily Base Charge:</span>
                                    <span style={{ fontWeight: 800, color: 'var(--navy-700)' }}>₹{selectedBed.charge_per_day}</span>
                                </div>

                                <button
                                    className="btn btn-primary w-full"
                                    style={{ height: 48, fontSize: 15, fontWeight: 700 }}
                                    onClick={handleBook}
                                    disabled={booking}
                                >
                                    {booking ? <span className="spinner" /> : '🚀 Confirm & Reserve'}
                                </button>
                                <button
                                    className="btn btn-ghost w-full btn-sm"
                                    style={{ marginTop: 8 }}
                                    onClick={() => setSelectedBed(null)}
                                >
                                    Cancel Selection
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="card" style={{ textAlign: 'center', padding: '40px 24px', background: 'var(--slate-50)', border: '2px dashed var(--slate-200)' }}>
                            <Bed size={40} className="text-slate-300" style={{ margin: '0 auto 16px' }} />
                            <p style={{ fontSize: 14, color: 'var(--slate-500)', fontWeight: 500 }}>Select an available bed from the list to proceed with admission.</p>
                        </div>
                    )}

                    <div className="alert alert-info">
                        <AlertCircle size={18} />
                        <div style={{ fontSize: 12 }}>
                            <p style={{ fontWeight: 700, marginBottom: 4 }}>Admission Notice</p>
                            <p>Online reservations are valid for 2 hours. Please report to the reception desk for document verification.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
