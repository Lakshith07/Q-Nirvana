import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Heart, Eye, EyeOff, User, Mail, Phone, MapPin, Lock, ChevronRight, ChevronLeft } from 'lucide-react';

const ROLES = [
    { value: 'patient', label: 'Patient', icon: '👤', desc: 'Book appointments, track queue, manage health records' },
    { value: 'doctor', label: 'Doctor', icon: '🩺', desc: 'Manage patient queues, record consultations' },
    { value: 'admin', label: 'Admin', icon: '⚙️', desc: 'Full hospital management and oversight' },
    { value: 'driver', label: 'Driver', icon: '🚑', desc: 'Handle emergency dispatch and route navigation' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['male', 'female', 'other'];

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1=role, 2=credentials, 3=profile
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        role: '', full_name: '', email: '', mobile: '', password: '',
        dob: '', gender: '', blood_group: '', address: '',
        emergency_contact_name: '', emergency_contact_phone: '',
        specialization: '', license_number: '', department: '', experience_years: '',
        vehicle_number: '',
    });

    const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const next = () => {
        if (step === 1 && !form.role) return toast.error('Please select a role');
        if (step === 2) {
            if (!form.full_name || !form.email || !form.mobile || !form.password)
                return toast.error('Fill all required fields');
            if (form.password.length < 8) return toast.error('Password must be 8+ characters');
        }
        setStep(s => s + 1);
    };

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const user = await register(form);
            toast.success('Account created! Welcome email sent 🎉');
            const routes = { patient: '/patient', doctor: '/doctor', admin: '/admin', driver: '/driver' };
            navigate(routes[user.role] || '/');
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors && Array.isArray(data.errors)) {
                toast.error(data.errors[0].msg);
            } else {
                toast.error(data?.message || 'Registration failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {/* Left */}
            <div style={{
                background: 'linear-gradient(135deg, var(--navy-900) 0%, #0f2044 60%, #0c1e3d 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '60px 48px', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(37,99,235,0.12)', filter: 'blur(50px)' }} />
                <div style={{ position: 'relative', textAlign: 'center', maxWidth: 400 }}>
                    <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#1e40af,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 8px 30px rgba(37,99,235,0.4)' }}>
                        <Heart size={32} color="white" />
                    </div>
                    <h1 style={{ color: 'white', fontSize: 34, fontWeight: 800, fontFamily: 'Space Grotesk', marginBottom: 12 }}>Join Q Nirvana</h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.7 }}>
                        Create your account in 3 simple steps and get started with smarter hospital management.
                    </p>

                    {/* Steps indicator */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 48 }}>
                        {['Select Role', 'Credentials', 'Profile'].map((s, i) => (
                            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: step > i + 1 ? 'var(--teal-500)' : step === i + 1 ? 'var(--navy-400)' : 'rgba(255,255,255,0.1)',
                                    border: `2px solid ${step >= i + 1 ? 'transparent' : 'rgba(255,255,255,0.2)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 700, fontSize: 13,
                                    transition: 'all 0.3s',
                                }}>
                                    {step > i + 1 ? '✓' : i + 1}
                                </div>
                                <span style={{ fontSize: 11, color: step >= i + 1 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>{s}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'var(--slate-50)', overflowY: 'auto' }}>
                <div style={{ width: '100%', maxWidth: 460 }}>
                    {/* Step 1: Role */}
                    {step === 1 && (
                        <div style={{ animation: 'fadeInUp 0.3s ease' }}>
                            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Choose Your Role</h2>
                            <p style={{ color: 'var(--slate-500)', fontSize: 14, marginBottom: 28 }}>Select the role that best describes you</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                {ROLES.map(r => (
                                    <div key={r.value}
                                        onClick={() => setForm(f => ({ ...f, role: r.value }))}
                                        style={{
                                            padding: '20px 16px', borderRadius: 12, cursor: 'pointer',
                                            border: `2px solid ${form.role === r.value ? 'var(--navy-500)' : 'var(--slate-200)'}`,
                                            background: form.role === r.value ? '#eff6ff' : 'white',
                                            transition: 'all 0.2s',
                                            textAlign: 'center',
                                        }}>
                                        <div style={{ fontSize: 32, marginBottom: 8 }}>{r.icon}</div>
                                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--slate-900)' }}>{r.label}</div>
                                        <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4, lineHeight: 1.4 }}>{r.desc}</div>
                                    </div>
                                ))}
                            </div>
                            <button className="btn btn-primary w-full" style={{ marginTop: 24 }} onClick={next}>
                                Continue <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* Step 2: Credentials */}
                    {step === 2 && (
                        <div style={{ animation: 'fadeInUp 0.3s ease' }}>
                            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Account Details</h2>
                            <p style={{ color: 'var(--slate-500)', fontSize: 14, marginBottom: 24 }}>Create your login credentials</p>

                            <div className="form-group">
                                <label className="form-label">Full Name <span className="required">*</span></label>
                                <div className="input-group">
                                    <User className="input-icon-left" size={16} />
                                    <input type="text" name="full_name" value={form.full_name} onChange={handle} className="form-input" placeholder="Dr. John Doe" required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email Address <span className="required">*</span></label>
                                <div className="input-group">
                                    <Mail className="input-icon-left" size={16} />
                                    <input type="email" name="email" value={form.email} onChange={handle} className="form-input" placeholder="you@example.com" required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mobile Number <span className="required">*</span></label>
                                <div className="input-group">
                                    <Phone className="input-icon-left" size={16} />
                                    <input type="tel" name="mobile" value={form.mobile} onChange={handle} className="form-input" placeholder="+91 9876543210" required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password <span className="required">*</span></label>
                                <div className="input-group">
                                    <Lock className="input-icon-left" size={16} />
                                    <input type={showPwd ? 'text' : 'password'} name="password" value={form.password} onChange={handle} className="form-input" placeholder="Min 8 chars, A-Z, a-z, 0-9" style={{ paddingRight: 40 }} required />
                                    <button type="button" className="input-icon-right" onClick={() => setShowPwd(!showPwd)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <p className="form-hint">Min 8 characters with uppercase, lowercase & number</p>
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="btn btn-outline" onClick={() => setStep(1)}>
                                    <ChevronLeft size={16} /> Back
                                </button>
                                <button className="btn btn-primary w-full" onClick={next}>
                                    Continue <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Role-specific profile */}
                    {step === 3 && (
                        <form onSubmit={submit} style={{ animation: 'fadeInUp 0.3s ease' }}>
                            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Complete Profile</h2>
                            <p style={{ color: 'var(--slate-500)', fontSize: 14, marginBottom: 24 }}>Add your additional details ({form.role})</p>

                            {form.role === 'patient' && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div className="form-group">
                                            <label className="form-label">Date of Birth</label>
                                            <input type="date" name="dob" value={form.dob} onChange={handle} className="form-input" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Gender</label>
                                            <select name="gender" value={form.gender} onChange={handle} className="form-select">
                                                <option value="">Select</option>
                                                {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Blood Group</label>
                                        <select name="blood_group" value={form.blood_group} onChange={handle} className="form-select">
                                            <option value="">Select blood group</option>
                                            {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Address</label>
                                        <div className="input-group">
                                            <MapPin className="input-icon-left" size={16} />
                                            <input type="text" name="address" value={form.address} onChange={handle} className="form-input" placeholder="Your full address" />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div className="form-group">
                                            <label className="form-label">Emergency Contact</label>
                                            <input type="text" name="emergency_contact_name" value={form.emergency_contact_name} onChange={handle} className="form-input" placeholder="Contact name" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Emergency Phone</label>
                                            <input type="tel" name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handle} className="form-input" placeholder="+91 ..." />
                                        </div>
                                    </div>
                                </>
                            )}

                            {form.role === 'doctor' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Specialization <span className="required">*</span></label>
                                        <input type="text" name="specialization" value={form.specialization} onChange={handle} className="form-input" placeholder="e.g. Cardiology, Pediatrics" required />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div className="form-group">
                                            <label className="form-label">Department</label>
                                            <input type="text" name="department" value={form.department} onChange={handle} className="form-input" placeholder="e.g. OPD, ICU" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Experience (yrs)</label>
                                            <input type="number" name="experience_years" value={form.experience_years} onChange={handle} className="form-input" placeholder="5" min="0" />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">License Number <span className="required">*</span></label>
                                        <input type="text" name="license_number" value={form.license_number} onChange={handle} className="form-input" placeholder="MCI-XXXX-XXXX" required />
                                    </div>
                                </>
                            )}

                            {form.role === 'driver' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Vehicle / Ambulance Number <span className="required">*</span></label>
                                        <input type="text" name="vehicle_number" value={form.vehicle_number} onChange={handle} className="form-input" placeholder="KA-01-AMB-001" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Driving License Number <span className="required">*</span></label>
                                        <input type="text" name="license_number" value={form.license_number} onChange={handle} className="form-input" placeholder="DL-XXXX-XXXXXXX" required />
                                    </div>
                                </>
                            )}

                            {form.role === 'admin' && (
                                <div className="alert alert-info" style={{ marginBottom: 20 }}>
                                    <span>Admin accounts are subject to verification before full access is granted.</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>
                                    <ChevronLeft size={16} /> Back
                                </button>
                                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                                    {loading ? <span className="spinner" /> : null}
                                    {loading ? 'Creating...' : 'Create Account 🎉'}
                                </button>
                            </div>
                        </form>
                    )}

                    <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--slate-500)' }}>
                        Already registered?{' '}
                        <Link to="/login" style={{ color: 'var(--navy-600)', fontWeight: 600 }}>Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
