import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Users, Activity, Star, Calendar,
    MoreVertical, Search, Filter, Mail,
    Stethoscope, Clock, CheckCircle, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDoctors() {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadDoctors();
    }, []);

    const loadDoctors = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/doctors');
            setDoctors(res.data.doctors || []);
        } catch (e) {
            toast.error('Failed to load doctors');
        } finally {
            setLoading(false);
        }
    };

    const toggleAvailability = async (id, current) => {
        try {
            // Note: Admin might need a specific toggle route or we use the doctor's one if allowed
            // For now, let's assume we use the user toggle from UserManagement if we want to disable them
            toast.info('Use User Management to disable staff accounts.');
        } catch (e) {
            toast.error('Operation failed');
        }
    };

    const filteredDoctors = doctors.filter(d =>
        d.full_name.toLowerCase().includes(search.toLowerCase()) ||
        d.specialization.toLowerCase().includes(search.toLowerCase()) ||
        d.department.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="section-title">Medical Staff Directory</h2>
                    <p className="section-sub">Overview of hospital doctors, specializations, and current workload</p>
                </div>
                <div className="stat-label">Total Doctors: <strong>{doctors.length}</strong></div>
            </div>

            <div className="card mb-6">
                <div className="card-body flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            className="form-control pl-10"
                            placeholder="Search by name, specialization, or department..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary">
                        <Calendar size={18} /> Manage Rotations
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="card animate-pulse h-48 bg-slate-50" />
                    ))
                ) : filteredDoctors.length === 0 ? (
                    <div className="col-span-full card py-20 text-center">
                        <Stethoscope size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-muted">No doctors found matching your search</p>
                    </div>
                ) : (
                    filteredDoctors.map(doctor => (
                        <div key={doctor.id} className="card hover-grow">
                            <div className="card-body">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="avatar-lg bg-teal-50 text-teal-700 font-bold">
                                            {doctor.full_name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900">{doctor.full_name}</h3>
                                            <div className="text-teal-600 text-sm font-semibold flex items-center gap-1">
                                                <Stethoscope size={14} /> {doctor.specialization}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`badge ${doctor.is_available ? 'badge-green' : 'badge-red'}`}>
                                        {doctor.is_available ? 'Available' : 'Busy'}
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Activity size={14} className="text-slate-400" />
                                        <span>Dept: <strong>{doctor.department}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Mail size={14} className="text-slate-400" />
                                        <span>{doctor.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Star size={14} className="text-yellow-500" />
                                        <span>Rating: <strong>{doctor.rating || 'N/A'}</strong></span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                    <div className="text-center">
                                        <div className="text-xs text-slate-400 uppercase font-bold">Today Load</div>
                                        <div className="text-xl font-extrabold text-navy">{doctor.today_load}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-slate-400 uppercase font-bold">Waiting</div>
                                        <div className="text-xl font-extrabold text-orange">{doctor.queue_size}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-footer bg-slate-50 flex justify-between p-3">
                                <button className="btn btn-ghost btn-sm text-navy">View Schedule</button>
                                <button className="btn btn-ghost btn-sm text-slate-500"><MoreVertical size={16} /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
