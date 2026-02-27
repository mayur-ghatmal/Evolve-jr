import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Shield, Truck, Building2, Users, ChevronRight, Zap, Clock, CheckCircle } from 'lucide-react'

interface Particle {
    x: number; y: number; vx: number; vy: number; radius: number; opacity: number;
}

function ParticleCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    useEffect(() => {
        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!
        let animId: number
        const particles: Particle[] = []
        const resize = () => {
            canvas.width = canvas.offsetWidth
            canvas.height = canvas.offsetHeight
        }
        resize()
        window.addEventListener('resize', resize)
        for (let i = 0; i < 80; i++) {
            particles.push({
                x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
                radius: Math.random() * 2 + 0.5, opacity: Math.random() * 0.5 + 0.1,
            })
        }
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(229,57,53,${p.opacity})`
                ctx.fill()
            })
            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x
                    const dy = particles[i].y - particles[j].y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist < 100) {
                        ctx.beginPath()
                        ctx.moveTo(particles[i].x, particles[i].y)
                        ctx.lineTo(particles[j].x, particles[j].y)
                        ctx.strokeStyle = `rgba(229,57,53,${0.15 * (1 - dist / 100)})`
                        ctx.lineWidth = 0.5
                        ctx.stroke()
                    }
                }
            }
            animId = requestAnimationFrame(draw)
        }
        draw()
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
    }, [])
    return <canvas ref={canvasRef} className="particle-canvas" style={{ width: '100%', height: '100%' }} />
}

const STATS = [
    { value: '4.2 min', label: 'Avg Response Time', icon: <Clock size={20} /> },
    { value: '98.5%', label: 'Dispatch Accuracy', icon: <CheckCircle size={20} /> },
    { value: '10,000+', label: 'Lives Assisted', icon: <Users size={20} /> },
    { value: '< 1 sec', label: 'Realtime Latency', icon: <Zap size={20} /> },
]

const FEATURES = [
    { icon: <Zap size={28} />, title: 'AI Priority Engine', desc: 'Smart triage scoring ensures critical cases reach help first, every time.', color: 'var(--red)' },
    { icon: <Truck size={28} />, title: 'Live Ambulance Tracking', desc: 'Real-time GPS tracking with optimized routing through traffic.', color: '#ff9500' },
    { icon: <Building2 size={28} />, title: 'Hospital Availability', desc: 'Live ICU and bed counts so dispatchers match patients to capacity instantly.', color: 'var(--green)' },
    { icon: <Shield size={28} />, title: 'Surge Mode', desc: 'Automatically detects disaster zones and reallocates all resources.', color: '#ab47bc' },
]

const ROLES = [
    { icon: <Shield size={22} />, label: 'Caller', desc: 'Report emergency', to: '/login' },
    { icon: <Activity size={22} />, label: 'Dispatcher', desc: 'Coordinate response', to: '/login' },
    { icon: <Truck size={22} />, label: 'Driver', desc: 'Accept & navigate', to: '/login' },
    { icon: <Building2 size={22} />, label: 'Hospital', desc: 'Manage capacity', to: '/login' },
]

export default function Landing() {
    const navigate = useNavigate()
    const [sosHover, setSosHover] = useState(false)

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
            {/* ── Hero ── */}
            <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                <ParticleCanvas />
                {/* Grid overlay */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(229,57,53,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(229,57,53,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
                {/* Radial glow */}
                <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(229,57,53,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

                {/* Navbar */}
                <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, var(--red), var(--red-dark))', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px var(--red-glow)' }}>
                            <Activity size={20} color="white" />
                        </div>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 700 }}>Rapid<span style={{ color: 'var(--red)' }}>Aid</span> <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.9rem' }}>AI</span></span>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>Sign In</button>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>Get Started</button>
                    </div>
                </nav>

                {/* Hero content */}
                <div style={{ position: 'relative', zIndex: 5, maxWidth: 1200, margin: '0 auto', padding: '0 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)', borderRadius: 20, padding: '6px 14px', marginBottom: 24 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 8px var(--red)', animation: 'sos-pulse 2s infinite' }} />
                            <span style={{ fontSize: '0.8rem', color: 'var(--red)', fontWeight: 600 }}>LIVE EMERGENCY RESPONSE</span>
                        </div>
                        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '3.8rem', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
                            Saving Minutes.<br />
                            <span style={{ color: 'var(--red)' }}>Saving Lives.</span>
                        </h1>
                        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
                            RapidAid AI connects emergency callers, ambulances, hospitals, and dispatchers in real-time — powered by intelligent triage and live routing.
                        </p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
                                Start Now <ChevronRight size={18} />
                            </button>
                            <button className="btn btn-ghost btn-lg" onClick={() => navigate('/login')}>
                                Sign In
                            </button>
                        </div>
                    </div>

                    {/* SOS Card */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
                        <div className="glass-card" style={{ padding: 40, textAlign: 'center', width: '100%', maxWidth: 340 }}>
                            <div style={{ marginBottom: 8, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2 }}>Emergency Trigger</div>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                                <button
                                    className="sos-btn"
                                    onMouseEnter={() => setSosHover(true)}
                                    onMouseLeave={() => setSosHover(false)}
                                    onClick={() => navigate('/login')}
                                    style={{ transform: sosHover ? 'scale(1.08)' : 'scale(1)' }}
                                >
                                    <span>SOS</span>
                                    <span style={{ fontSize: '0.55rem', letterSpacing: 1, opacity: 0.8 }}>EMERGENCY</span>
                                </button>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>One tap connects you to the nearest ambulance and hospital</p>
                            <hr className="divider" style={{ margin: '20px 0' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {ROLES.map(r => (
                                    <button key={r.label} className="btn btn-ghost btn-sm" style={{ flexDirection: 'column', gap: 4, height: 56, padding: 8 }} onClick={() => navigate('/login')}>
                                        {r.icon}
                                        <span style={{ fontSize: '0.7rem' }}>{r.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Stats ── */}
            <section style={{ padding: '80px 60px', background: 'var(--surface)', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
                    {STATS.map(s => (
                        <div key={s.label} style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--red)', marginBottom: 12 }}>{s.icon}</div>
                            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>{s.value}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Features ── */}
            <section style={{ padding: '100px 60px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 60 }}>
                        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.5rem', fontWeight: 800, marginBottom: 12 }}>How RapidAid Works</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: 500, margin: '0 auto' }}>Four layers of intelligent coordination to ensure every second counts</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
                        {FEATURES.map(f => (
                            <div key={f.title} className="glass-card" style={{ padding: 32, display: 'flex', gap: 20 }}>
                                <div style={{ width: 56, height: 56, borderRadius: 16, background: `${f.color}20`, border: `1px solid ${f.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, flexShrink: 0 }}>
                                    {f.icon}
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8, color: 'var(--text-primary)' }}>{f.title}</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, fontSize: '0.9rem' }}>{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section style={{ padding: '80px 60px', background: 'var(--surface)', borderTop: '1px solid var(--glass-border)' }}>
                <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 800, marginBottom: 16 }}>Ready to Join RapidAid?</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Register as an ambulance driver, hospital staff, dispatcher, or set up as an admin.</p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>Create Account</button>
                        <button className="btn btn-ghost btn-lg" onClick={() => navigate('/login')}>Sign In</button>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer style={{ padding: '24px 60px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <Activity size={16} color="var(--red)" />
                    RapidAid AI © 2026
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Emergency Response Systems</div>
            </footer>
        </div>
    )
}
