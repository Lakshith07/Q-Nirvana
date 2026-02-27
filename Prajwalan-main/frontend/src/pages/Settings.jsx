import { useState, useEffect } from 'react';
import { Bell, Shield, Moon, CheckCircle, Mail, Key, ShieldOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function SettingsPage() {
    const { user } = useAuth();
    const isDoctor = user?.role === 'doctor';

    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const [pushEnabled, setPushEnabled] = useState(() => {
        const stored = localStorage.getItem('notifications');
        if (stored === 'false') return false;
        return window.Notification && Notification.permission === 'granted';
    });

    // 2FA state
    const [twoFaStep, setTwoFaStep] = useState('idle'); // idle | email | otp | disable-otp | done
    const [twoFaEmail, setTwoFaEmail] = useState('');
    const [twoFaOtp, setTwoFaOtp] = useState('');
    const [twoFaLoading, setTwoFaLoading] = useState(false);
    const [twoFaEnabled, setTwoFaEnabled] = useState(false);

    // Initial check for 2FA status
    useEffect(() => {
        const check2FA = async () => {
            if (isDoctor) {
                try {
                    const res = await api.get('/auth/me'); // Or a specialized profile endpoint
                    if (res.data.user.two_fa_enabled) {
                        setTwoFaEnabled(true);
                    }
                } catch (err) {
                    console.error('Error checking 2FA status:', err);
                }
            }
        };
        check2FA();
    }, [isDoctor]);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    useEffect(() => {
        localStorage.setItem('notifications', pushEnabled ? 'true' : 'false');
    }, [pushEnabled]);

    const handlePushToggle = async () => {
        if (!window.Notification) return toast.error('This browser does not support desktop notifications');
        if (pushEnabled) {
            setPushEnabled(false);
            return toast.success('Push notifications paused.');
        }
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') { setPushEnabled(true); toast.success('Push notifications enabled!'); }
            else toast.error('Notification permission was denied.');
        } catch (e) { toast.error('Could not request notification settings.'); }
    };

    // ENABLE 2FA - Step 1: Send OTP
    const handleSendSetupOtp = async () => {
        if (!twoFaEmail || !twoFaEmail.includes('@')) return toast.error('Enter a valid email address');
        setTwoFaLoading(true);
        try {
            const res = await api.post('/auth/2fa/setup-send-otp', { email: twoFaEmail });
            toast.success(res.data.message || 'Verification code sent to your email.');
            setTwoFaStep('otp');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send verification code');
        } finally {
            setTwoFaLoading(false);
        }
    };

    // ENABLE 2FA - Step 2: Verify OTP
    const handleVerifySetupOtp = async () => {
        if (!twoFaOtp || twoFaOtp.length !== 6) return toast.error('Enter the 6-digit verification code');
        setTwoFaLoading(true);
        try {
            const res = await api.post('/auth/2fa/verify-setup', { otp: twoFaOtp });
            toast.success('Two-Factor Authentication enabled! 🎉');
            setTwoFaEnabled(true);
            setTwoFaStep('done');
            setTwoFaOtp('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid verification code');
        } finally {
            setTwoFaLoading(false);
        }
    };

    // DISABLE 2FA - Step 1: Send OTP
    const handleSendDisableOtp = async () => {
        setTwoFaLoading(true);
        try {
            const res = await api.post('/auth/2fa/disable-send-otp');
            toast.success(res.data.message || 'Verification code sent to your 2FA email.');
            setTwoFaStep('disable-otp');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send verification code');
        } finally {
            setTwoFaLoading(false);
        }
    };

    // DISABLE 2FA - Step 2: Verify OTP
    const handleVerifyDisableOtp = async () => {
        if (!twoFaOtp || twoFaOtp.length !== 6) return toast.error('Enter the 6-digit verification code');
        setTwoFaLoading(true);
        try {
            const res = await api.post('/auth/2fa/verify-disable', { otp: twoFaOtp });
            toast.success('Two-Factor Authentication has been disabled.');
            setTwoFaEnabled(false);
            setTwoFaStep('idle');
            setTwoFaOtp('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid verification code');
        } finally {
            setTwoFaLoading(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h2 className="section-title">Account Settings</h2>
                <p className="section-sub">Manage your profile, security, and notification preferences</p>
            </div>

            <div style={{ display: 'grid', gap: 24 }}>
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">General Preferences</div>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Moon size={18} color="var(--slate-600)" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Dark Mode</div>
                                        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Switch to the dark side of the interface</div>
                                    </div>
                                </div>
                                <div onClick={() => setDarkMode(!darkMode)}
                                    style={{ cursor: 'pointer', width: 44, height: 24, background: darkMode ? 'var(--navy-600)' : 'var(--slate-300)', borderRadius: 24, position: 'relative', transition: 'background 0.3s' }}>
                                    <div style={{ width: 18, height: 18, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: darkMode ? 23 : 3, transition: 'left 0.3s' }}></div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Bell size={18} color="var(--slate-600)" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Push Notifications</div>
                                        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Get instant alerts on your desktop</div>
                                    </div>
                                </div>
                                <div onClick={handlePushToggle}
                                    style={{ cursor: 'pointer', width: 44, height: 24, background: pushEnabled ? 'var(--navy-600)' : 'var(--slate-300)', borderRadius: 24, position: 'relative', transition: 'background 0.3s' }}>
                                    <div style={{ width: 18, height: 18, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: pushEnabled ? 23 : 3, transition: 'left 0.3s' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {isDoctor && (
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Security</div>
                            {twoFaEnabled && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontWeight: 700, fontSize: 13 }}>
                                    <CheckCircle size={16} /> 2FA Secured
                                </span>
                            )}
                        </div>
                        <div className="card-body">
                            {/* IDLE STATE - ENABLE */}
                            {twoFaStep === 'idle' && !twoFaEnabled && (
                                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Shield size={20} color="var(--danger)" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700 }}>Enable Two-Factor Authentication</div>
                                        <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>Secure your doctor account with an email verification code.</div>
                                    </div>
                                    <button className="btn btn-primary btn-sm" onClick={() => setTwoFaStep('email')}>Enable</button>
                                </div>
                            )}

                            {/* IDLE STATE - DISABLE */}
                            {twoFaStep === 'idle' && twoFaEnabled && (
                                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ShieldOff size={20} color="var(--success)" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700 }}>2FA is Currently Active</div>
                                        <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>Your account is protected. You can disable it by verifying your identity.</div>
                                    </div>
                                    <button className="btn btn-outline btn-sm" onClick={handleSendDisableOtp} disabled={twoFaLoading}>
                                        {twoFaLoading ? 'Sending...' : 'Disable'}
                                    </button>
                                </div>
                            )}

                            {/* SETUP STEP 1 - EMAIL */}
                            {twoFaStep === 'email' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Mail size={18} color="var(--navy-600)" />
                                        <div style={{ fontWeight: 700 }}>Verify your email address</div>
                                    </div>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="Enter your Gmail address"
                                        value={twoFaEmail}
                                        onChange={e => setTwoFaEmail(e.target.value)}
                                    />
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button className="btn btn-outline btn-sm" onClick={() => setTwoFaStep('idle')}>Cancel</button>
                                        <button className="btn btn-primary btn-sm" disabled={twoFaLoading} onClick={handleSendSetupOtp}>
                                            {twoFaLoading ? 'Sending...' : 'Send OTP'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* SETUP STEP 2 / DISABLE VERIFY - OTP */}
                            {(twoFaStep === 'otp' || twoFaStep === 'disable-otp') && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Key size={18} color="var(--navy-600)" />
                                        <div>
                                            <div style={{ fontWeight: 700 }}>Enter the 6-digit code</div>
                                            <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Check your email inbox for the verification code.</div>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={twoFaOtp}
                                        onChange={e => setTwoFaOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        style={{ letterSpacing: 8, fontSize: 24, textAlign: 'center', fontWeight: 800 }}
                                    />
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button className="btn btn-outline btn-sm" onClick={() => setTwoFaStep('idle')}>Cancel</button>
                                        <button className="btn btn-primary btn-sm" disabled={twoFaLoading} onClick={twoFaStep === 'otp' ? handleVerifySetupOtp : handleVerifyDisableOtp}>
                                            {twoFaLoading ? 'Verifying...' : 'Verify Code'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* SUCCESS STATE */}
                            {twoFaStep === 'done' && (
                                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                    <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 12px' }} />
                                    <div style={{ fontWeight: 800, fontSize: 18 }}>Verification Successful</div>
                                    <p style={{ color: 'var(--slate-500)', fontSize: 13, marginBottom: 16 }}>Your 2FA is now fully active.</p>
                                    <button className="btn btn-primary btn-sm" onClick={() => setTwoFaStep('idle')}>Close</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
