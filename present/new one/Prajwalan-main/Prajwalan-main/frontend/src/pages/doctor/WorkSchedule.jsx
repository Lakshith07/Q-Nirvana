import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Calendar, Clock, Plus, Trash2,
    AlertCircle, CheckCircle, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function WorkSchedule() {
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newSlot, setNewSlot] = useState({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        max_patients: 20
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadSchedule();
    }, []);

    const loadSchedule = async () => {
        setLoading(true);
        try {
            const res = await api.get('/doctor/schedule');
            setSchedule(res.data.schedule || []);
        } catch (e) {
            toast.error('Failed to load schedule');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSlot = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/doctor/schedule', newSlot);
            toast.success('Shift added successfully');
            loadSchedule();
        } catch (e) {
            toast.error('Failed to add shift. Ensure times are valid.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteSlot = async (id) => {
        if (!window.confirm('Remove this shift?')) return;
        try {
            await api.delete(`/doctor/schedule/${id}`);
            toast.success('Shift removed');
            setSchedule(schedule.filter(s => s.id !== id));
        } catch (e) {
            toast.error('Failed to remove shift');
        }
    };

    return (
        <div>
            <div className="mb-8">
                <h2 className="section-title">Work Schedule</h2>
                <p className="section-sub">Manage your weekly availability and consultation slots</p>
            </div>

            <div className="grid-3">
                {/* Add Slot Form */}
                <div className="card col-span-1">
                    <div className="card-header">
                        <div className="card-title">Add New Shift</div>
                    </div>
                    <form onSubmit={handleAddSlot} className="card-body">
                        <div className="form-group mb-4">
                            <label className="form-label">Day of Week</label>
                            <select
                                className="form-control"
                                value={newSlot.day_of_week}
                                onChange={e => setNewSlot({ ...newSlot, day_of_week: parseInt(e.target.value) })}
                            >
                                {DAYS.map((day, idx) => (
                                    <option key={idx} value={idx}>{day}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid-2 gap-4 mb-4">
                            <div className="form-group">
                                <label className="form-label">Start Time</label>
                                <input
                                    type="time"
                                    className="form-control"
                                    value={newSlot.start_time}
                                    onChange={e => setNewSlot({ ...newSlot, start_time: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Time</label>
                                <input
                                    type="time"
                                    className="form-control"
                                    value={newSlot.end_time}
                                    onChange={e => setNewSlot({ ...newSlot, end_time: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group mb-6">
                            <label className="form-label">Max Patients</label>
                            <input
                                type="number"
                                className="form-control"
                                value={newSlot.max_patients}
                                onChange={e => setNewSlot({ ...newSlot, max_patients: parseInt(e.target.value) })}
                                min="1"
                                max="100"
                            />
                            <p className="text-xs text-muted mt-2">Recommended: 20 per shift</p>
                        </div>
                        <button type="submit" disabled={submitting} className="btn btn-primary w-full">
                            {submitting ? <div className="spinner" /> : <Plus size={18} />}
                            Add Shift Slot
                        </button>
                    </form>
                </div>

                {/* Schedule List */}
                <div className="card col-span-2">
                    <div className="card-header">
                        <div className="card-title">Weekly Slots</div>
                    </div>
                    <div className="card-body p-0">
                        {loading ? (
                            <div className="py-20 text-center">
                                <div className="spinner mx-auto" />
                            </div>
                        ) : schedule.length === 0 ? (
                            <div className="py-20 text-center">
                                <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-muted">No shifts scheduled yet.</p>
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Day</th>
                                            <th>Time Slot</th>
                                            <th>Max Patients</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {schedule.map(slot => (
                                            <tr key={slot.id}>
                                                <td className="font-bold text-navy-800">{DAYS[slot.day_of_week]}</td>
                                                <td>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Clock size={14} className="text-slate-400" />
                                                        {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <span className="badge badge-outline">{slot.max_patients} Patients</span>
                                                    </div>
                                                </td>
                                                <td className="text-right">
                                                    <button
                                                        onClick={() => handleDeleteSlot(slot.id)}
                                                        className="btn btn-ghost text-danger p-2"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    <div className="card-footer bg-slate-50 flex gap-3 p-4 border-t border-slate-100">
                        <Info size={16} className="text-info mt-1" />
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Shifts updated here are used to show your availability to patients during the OPD booking process.
                            Ensure you provide enough transition time between shifts.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
