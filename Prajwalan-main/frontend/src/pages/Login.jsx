import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Heart, Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck, Key } from 'lucide-react';

export default function LoginPage() {
    const { login, completeLoginWithOtp } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

    // 2FA state
    const [twoFaMode, setTwoFaMode] = useState(false);
    const [twoFaUserId, setTwoFaUserId] = useState('');
    const [twoFaMaskedEmail, setTwoFaMaskedEmail] = useState('');
    const [otpValue, setOtpValue] = useState('');

    const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) return toast.error('All fields required');
        setLoading(true);
        try {
            const result = await login(form.email, form.password);

            // Doctor 2FA required
            if (result?.requires_2fa) {
                setTwoFaUserId(result.user_id);
                setTwoFaMaskedEmail(result.two_fa_email);
                setTwoFaMode(true);
                toast.success(`Verification code sent to ${result.two_fa_email}`);
                return;
            }

            // Normal login success
            toast.success(`Welcome back, ${result.full_name}!`);
            const routes = { patient: '/patient', doctor: '/doctor', admin: '/admin', driver: '/driver' };
            navigate(routes[result.role] || '/');
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors && Array.isArray(data.errors)) {
                toast.error(data.errors[0].msg);
            } else {
                toast.error(data?.message || 'Login failed. Check credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    const submitOtp = async (e) => {
        e.preventDefault();
        if (!otpValue || otpValue.length !== 6) return toast.error('Enter the 6-digit verification code');
        setLoading(true);
        try {
            const user = await completeLoginWithOtp(twoFaUserId, otpValue);
            toast.success(`Welcome back, Dr. ${user.full_name}! ✅`);
            navigate('/doctor');
        } catch (err) {
            const data = err.response?.data;
            toast.error(data?.message || 'Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const features = ['Priority queue management', 'Real-time patient notifications', 'Secure consultation records', 'Emergency response coordination'];

    return (
        <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {/* Left panel */}
            <div style={{
                background: 'linear-gradient(135deg, var(--navy-900) 0%, #0f2044 60%, #0c1e3d 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '60px 48px', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: -100, right: -100, width: 350, height: 350, borderRadius: '50%', background: 'rgba(37,99,235,0.12)', filter: 'blur(50px)' }} />
                <div style={{ position: 'absolute', bottom: -60, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(13,148,136,0.1)', filter: 'blur(40px)' }} />

                <div style={{ position: 'relative', textAlign: 'center', maxWidth: 400 }}>
                    <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#1e40af,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 8px 30px rgba(37,99,235,0.4)' }}>
                        <Heart size={32} color="white" />
                    </div>
                    <h1 style={{ color: 'white', fontSize: 36, fontWeight: 800, fontFamily: 'Space Grotesk', marginBottom: 12 }}>Q Nirvana</h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.7 }}>Intelligent queue management and hospital operations platform</p>

                    <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
                        {features.map(f => (
                            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--teal-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <ArrowRight size={10} color="white" />
                                </div>
                                {f}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right panel */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'var(--slate-50)' }}>
                <div style={{ width: '100%', maxWidth: 420 }}>

                    {/* Normal login form */}
                    {!twoFaMode && (
                        <>
                            <div style={{ marginBottom: 36 }}>
                                <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--slate-900)', marginBottom: 6 }}>Welcome back</h2>
                                <p style={{ color: 'var(--slate-500)', fontSize: 14 }}>Sign in to your Q Nirvana account</p>
                            </div>

                            <form onSubmit={submit}>
                                <div className="form-group">
                                    <label className="form-label">Email Address <span className="required">*</span></label>
                                    <div className="input-group">
                                        <Mail className="input-icon-left" size={16} />
                                        <input
                                            type="email" name="email" value={form.email} onChange={handle}
                                            className="form-input" placeholder="you@example.com"
                                            autoComplete="email" required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Password <span className="required">*</span></label>
                                    <div className="input-group">
                                        <Lock className="input-icon-left" size={16} />
                                        <input
                                            type={showPwd ? 'text' : 'password'}
                                            name="password" value={form.password} onChange={handle}
                                            className="form-input" placeholder="Your password"
                                            style={{ paddingRight: 40 }} required
                                        />
                                        <button type="button" className="input-icon-right" onClick={() => setShowPwd(!showPwd)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-primary w-full" style={{ marginTop: 8 }} disabled={loading}>
                                    {loading ? <span className="spinner" /> : null}
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </button>
                            </form>

                            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--slate-500)' }}>
                                Don't have an account?{' '}
                                <Link to="/register" style={{ color: 'var(--navy-600)', fontWeight: 600 }}>Register here</Link>
                            </p>
                        </>
                    )}

                    {/* 2FA OTP step */}
                    {twoFaMode && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                                <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#1e40af,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 30px rgba(37,99,235,0.3)' }}>
                                    <ShieldCheck size={32} color="white" />
                                </div>
                                <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--slate-900)', marginBottom: 6 }}>Security Verification</h2>
                                <p style={{ color: 'var(--slate-500)', fontSize: 14 }}>
                                    Enter the verification code sent to<br />
                                    <strong style={{ color: 'var(--navy-600)' }}>{twoFaMaskedEmail}</strong>
                                </p>
                            </div>

                            <form onSubmit={submitOtp}>
                                <div className="form-group">
                                    <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>
                                        <Key size={14} style={{ marginRight: 6 }} />
                                        Enter One-Time Password
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={otpValue}
                                        onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        style={{ letterSpacing: 14, fontSize: 30, textAlign: 'center', fontWeight: 900, paddingTop: 14, paddingBottom: 14 }}
                                        autoFocus
                                    />
                                    <p style={{ fontSize: 12, color: 'var(--slate-400)', textAlign: 'center', marginTop: 8 }}>
                                        Check your Gmail inbox (and spam folder)
                                    </p>
                                </div>

                                <button type="submit" className="btn btn-primary w-full" style={{ marginTop: 8 }} disabled={loading}>
                                    {loading ? <span className="spinner" /> : null}
                                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                                </button>
                            </form>

                            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}>
                                <button onClick={() => { setTwoFaMode(false); setOtpValue(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-500)', fontSize: 14 }}>
                                    ← Back to login
                                </button>
                            </p>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}
