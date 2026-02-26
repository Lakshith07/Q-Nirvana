import { Link } from 'react-router-dom';
import { Heart, Shield, Activity, Users, Zap, Award, ArrowRight, CheckCircle } from 'lucide-react';

const FEATURES = [
    { icon: '🏥', title: 'Smart OPD Booking', desc: 'Book appointments with real-time doctor availability and queue tracking.' },
    { icon: '⚡', title: 'Priority Queue', desc: 'AI-powered triage: Emergency > Maternity > Senior > Child > General.' },
    { icon: '🚑', title: 'Emergency Dispatch', desc: 'One-tap ambulance dispatch with Dijkstra\'s optimal route algorithm.' },
    { icon: '🩸', title: 'Blood Bank', desc: 'Real-time blood inventory management with instant request processing.' },
    { icon: '🛏️', title: 'Bed Management', desc: 'Track AC, ICU, ventilated beds with live occupancy status.' },
    { icon: '📋', title: 'Medical Records', desc: 'Secure, tamper-proof patient history accessible anytime.' },
];

const STATS = [
    { value: '10,000+', label: 'Patients Served' },
    { value: '99.9%', label: 'Uptime' },
    { value: '< 30s', label: 'Emergency Response' },
    { value: '4', label: 'User Roles' },
];

export default function LandingPage() {
    return (
        <div style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', background: 'var(--slate-50)' }}>
            {/* Navbar */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--slate-200)',
                padding: '0 5%',
                height: '68px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: 'linear-gradient(135deg, #1e40af, #0d9488)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                    }}>
                        <Heart size={18} color="white" />
                    </div>
                    <div>
                        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-800)', fontFamily: 'Space Grotesk' }}>Q Nirvana</span>
                        <span style={{ fontSize: 10, color: 'var(--slate-500)', display: 'block', lineHeight: 1, letterSpacing: '0.08em' }}>HOSPITAL MANAGEMENT</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Link to="/login" className="btn btn-outline btn-sm">Sign In</Link>
                    <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
                </div>
            </nav>

            {/* Hero */}
            <section style={{
                background: 'linear-gradient(135deg, var(--navy-900) 0%, #0f2044 50%, #0d2759 100%)',
                padding: '100px 5% 120px',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative circles */}
                <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', filter: 'blur(60px)' }} />
                <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(13,148,136,0.12)', filter: 'blur(50px)' }} />

                <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'rgba(45,212,191,0.15)',
                        border: '1px solid rgba(45,212,191,0.3)',
                        color: '#2dd4bf', padding: '6px 16px',
                        borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600,
                        letterSpacing: '0.06em', marginBottom: 28,
                    }}>
                        <Zap size={12} fill="currentColor" />
                        PRAJWALAN 2K26 — NATIONAL HACKATHON
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(36px, 6vw, 64px)',
                        fontWeight: 800, color: 'white', lineHeight: 1.15,
                        margin: '0 0 24px', fontFamily: 'Space Grotesk',
                    }}>
                        Next-Generation<br />
                        <span style={{ background: 'linear-gradient(90deg,#2dd4bf,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Hospital Management
                        </span>
                    </h1>

                    <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 580, margin: '0 auto 40px', lineHeight: 1.7 }}>
                        A secure, intelligent platform for patients, doctors, drivers, and administrators.
                        Powered by priority-based queue algorithms and Dijkstra's routing.
                    </p>

                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/register" className="btn btn-teal btn-xl" style={{ gap: 10 }}>
                            Start Now <ArrowRight size={18} />
                        </Link>
                        <Link to="/login" className="btn btn-outline btn-xl" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' }}>
                            Sign In
                        </Link>
                    </div>

                    {/* Trust badges */}
                    <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 48, flexWrap: 'wrap' }}>
                        {['HIPAA Compliant', 'Encrypted Data', 'Real-time Alerts', '24/7 Emergency'].map(badge => (
                            <div key={badge} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                                <CheckCircle size={14} color="#2dd4bf" />
                                {badge}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section style={{ background: 'white', padding: '0', borderBottom: '1px solid var(--slate-200)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', padding: '0' }}>
                    {STATS.map((s, i) => (
                        <div key={i} style={{
                            padding: '32px 24px',
                            textAlign: 'center',
                            borderRight: i < 3 ? '1px solid var(--slate-200)' : 'none'
                        }}>
                            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--navy-600)', fontFamily: 'Space Grotesk' }}>{s.value}</div>
                            <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 4 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section style={{ padding: '80px 5%', background: 'var(--slate-50)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 56 }}>
                        <h2 style={{ fontSize: 36, fontWeight: 800, color: 'var(--slate-900)', fontFamily: 'Space Grotesk', marginBottom: 12 }}>
                            Everything You Need
                        </h2>
                        <p style={{ fontSize: 16, color: 'var(--slate-500)', maxWidth: 500, margin: '0 auto' }}>
                            A comprehensive platform designed for every stakeholder in the healthcare ecosystem.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>
                        {FEATURES.map((f, i) => (
                            <div key={i} style={{
                                background: 'white',
                                border: '1px solid var(--slate-200)',
                                borderRadius: 16,
                                padding: '28px 24px',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                cursor: 'default',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                            >
                                <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
                                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--slate-900)' }}>{f.title}</h3>
                                <p style={{ fontSize: 14, color: 'var(--slate-500)', lineHeight: 1.6 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Roles */}
            <section style={{ padding: '80px 5%', background: 'white' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 48 }}>
                        <h2 style={{ fontSize: 36, fontWeight: 800, color: 'var(--slate-900)', fontFamily: 'Space Grotesk', marginBottom: 12 }}>Four Powerful Dashboards</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 }}>
                        {[
                            { role: 'Patient', icon: '👤', color: '#dbeafe', border: '#93c5fd', desc: 'Book OPD, track queue, blood bank, emergency bypass, family view.' },
                            { role: 'Doctor', icon: '🩺', color: '#ccfbf1', border: '#5eead4', desc: 'Manage priority queue, record consultations, update availability.' },
                            { role: 'Admin', icon: '⚙️', color: '#ede9fe', border: '#c4b5fd', desc: 'Full oversight: beds, blood, staff, OPD assignment, audit logs.' },
                            { role: 'Driver', icon: '🚑', color: '#ffedd5', border: '#fdba74', desc: 'Accept emergencies, Dijkstra-optimized routes, status updates.' },
                        ].map(r => (
                            <div key={r.role} style={{ background: r.color, border: `1px solid ${r.border}`, borderRadius: 14, padding: '28px 22px' }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>{r.icon}</div>
                                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{r.role}</h3>
                                <p style={{ fontSize: 13, color: 'var(--slate-600)', lineHeight: 1.6 }}>{r.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section style={{
                background: 'linear-gradient(135deg, var(--navy-900), #0f2044)',
                padding: '80px 5%',
                textAlign: 'center'
            }}>
                <h2 style={{ fontSize: 36, fontWeight: 800, color: 'white', marginBottom: 16, fontFamily: 'Space Grotesk' }}>
                    Ready to Transform Healthcare?
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, marginBottom: 36, maxWidth: 500, margin: '0 auto 36px' }}>
                    Join Q Nirvana and experience the future of hospital management.
                </p>
                <Link to="/register" className="btn btn-teal btn-xl">
                    Create Your Account <ArrowRight size={18} />
                </Link>
            </section>

            {/* Footer */}
            <footer style={{ background: 'var(--navy-950)', padding: '24px 5%', textAlign: 'center' }}>
                <p style={{ color: 'var(--slate-500)', fontSize: 13 }}>
                    © 2026 Q Nirvana Hospital Management System · Prajwalan 2K26 · Built with ❤️
                </p>
            </footer>
        </div>
    );
}
